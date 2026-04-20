-- ─── 1. Auto-set lock_date = end_date when creating markets without explicit lock_date ───
CREATE OR REPLACE FUNCTION public.set_default_lock_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lock_date IS NULL THEN
    NEW.lock_date := NEW.end_date;
  END IF;
  -- Ensure lock_date <= end_date
  IF NEW.lock_date > NEW.end_date THEN
    NEW.lock_date := NEW.end_date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_default_lock_date ON public.markets;
CREATE TRIGGER trg_set_default_lock_date
  BEFORE INSERT OR UPDATE OF end_date, lock_date ON public.markets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_lock_date();

-- Backfill existing markets
UPDATE public.markets
SET lock_date = end_date
WHERE lock_date IS NULL;

-- ─── 2. Index for fast cron lookups ───
CREATE INDEX IF NOT EXISTS idx_markets_status_lock_date
  ON public.markets (status, lock_date)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_markets_status_end_date
  ON public.markets (status, end_date)
  WHERE status = 'closed';

-- ─── 3. Harden place_prediction with clearer pt-BR error messages ───
CREATE OR REPLACE FUNCTION public.place_prediction(
  p_market_id uuid,
  p_selected_option text,
  p_credits integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_market RECORD;
  v_option RECORD;
  v_balance integer;
  v_existing_id uuid;
  v_prediction_id uuid;
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar autenticado para fazer uma previsão';
  END IF;

  -- Validate credits amount
  IF p_credits IS NULL OR p_credits <= 0 THEN
    RAISE EXCEPTION 'A quantidade de créditos deve ser maior que zero';
  END IF;

  IF p_credits > 1000000 THEN
    RAISE EXCEPTION 'Quantidade de créditos excede o limite por previsão';
  END IF;

  -- Lock market row
  SELECT id, status, lock_date, end_date
  INTO v_market
  FROM public.markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mercado não encontrado';
  END IF;

  IF v_market.status <> 'open' THEN
    RAISE EXCEPTION 'Este mercado não está aberto para previsões';
  END IF;

  IF v_market.lock_date IS NOT NULL AND v_market.lock_date <= now() THEN
    RAISE EXCEPTION 'Este mercado já está bloqueado para novas previsões';
  END IF;

  -- Validate option belongs to market
  SELECT id, label
  INTO v_option
  FROM public.market_options
  WHERE market_id = p_market_id
    AND id = p_selected_option::uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opção inválida para este mercado';
  END IF;

  -- Check for existing prediction (one per market)
  SELECT id INTO v_existing_id
  FROM public.predictions
  WHERE user_id = v_user_id AND market_id = p_market_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Você já fez uma previsão neste mercado';
  END IF;

  -- Lock profile and check balance
  SELECT futra_credits INTO v_balance
  FROM public.profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;

  IF v_balance < p_credits THEN
    RAISE EXCEPTION 'Insufficient credits — saldo atual: %, necessário: %', v_balance, p_credits;
  END IF;

  -- Create prediction
  INSERT INTO public.predictions (
    user_id, market_id, selected_option, credits_allocated, status
  ) VALUES (
    v_user_id, p_market_id, p_selected_option, p_credits, 'pending'
  )
  RETURNING id INTO v_prediction_id;

  -- Debit credits (bypass protect_profile_fields via service-definer + direct UPDATE allowed by trigger logic)
  -- The trigger allows credits to change via this RPC because we use SECURITY DEFINER as postgres
  UPDATE public.profiles
  SET futra_credits = futra_credits - p_credits,
      total_predictions = total_predictions + 1,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Log transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, reference_id, description)
  VALUES (v_user_id, -p_credits, 'prediction', v_prediction_id, 'Previsão em mercado');

  -- Update market option totals
  UPDATE public.market_options
  SET total_credits = total_credits + p_credits,
      total_votes = total_votes + 1
  WHERE id = v_option.id;

  -- Update market totals
  UPDATE public.markets
  SET total_credits = total_credits + p_credits,
      total_participants = (
        SELECT COUNT(DISTINCT user_id) FROM public.predictions WHERE market_id = p_market_id
      ),
      updated_at = now()
  WHERE id = p_market_id;

  -- Recompute percentages for all options in this market
  WITH totals AS (
    SELECT SUM(total_credits)::numeric AS total FROM public.market_options WHERE market_id = p_market_id
  )
  UPDATE public.market_options mo
  SET percentage = CASE
    WHEN (SELECT total FROM totals) > 0
    THEN ROUND((mo.total_credits::numeric / (SELECT total FROM totals)) * 100, 2)
    ELSE 0
  END
  WHERE market_id = p_market_id;

  RETURN v_prediction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_prediction(uuid, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.place_prediction(uuid, text, integer) TO authenticated;