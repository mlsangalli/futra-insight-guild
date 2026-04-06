
-- =============================================
-- TASK 2: market_options normalized table
-- =============================================

CREATE TABLE public.market_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  label text NOT NULL,
  total_votes integer DEFAULT 0,
  total_credits integer DEFAULT 0,
  percentage numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.market_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read market_options"
  ON public.market_options FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert market_options"
  ON public.market_options FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update market_options"
  ON public.market_options FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete market_options"
  ON public.market_options FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_market_options_market_id ON public.market_options(market_id);

-- Migrate existing JSONB options data to market_options
INSERT INTO public.market_options (id, market_id, label, total_votes, total_credits, percentage)
SELECT 
  CASE 
    WHEN (opt->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN (opt->>'id')::uuid
    ELSE gen_random_uuid()
  END,
  m.id,
  COALESCE(opt->>'label', ''),
  COALESCE((opt->>'votes')::integer, 0),
  COALESCE((opt->>'creditsAllocated')::integer, 0),
  COALESCE((opt->>'percentage')::numeric, 0)
FROM public.markets m,
  jsonb_array_elements(m.options) opt
WHERE m.options IS NOT NULL AND jsonb_typeof(m.options) = 'array' AND jsonb_array_length(m.options) > 0;

-- Trigger: sync market_options -> JSONB cache on markets
CREATE OR REPLACE FUNCTION public.sync_options_jsonb()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.markets SET options = (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', mo.id,
      'label', mo.label,
      'votes', mo.total_votes,
      'creditsAllocated', mo.total_credits,
      'percentage', mo.percentage
    ) ORDER BY mo.created_at), '[]'::jsonb)
    FROM public.market_options mo WHERE mo.market_id = COALESCE(NEW.market_id, OLD.market_id)
  ) WHERE id = COALESCE(NEW.market_id, OLD.market_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sync_options
AFTER INSERT OR UPDATE OR DELETE ON public.market_options
FOR EACH ROW EXECUTE FUNCTION public.sync_options_jsonb();

-- Trigger: auto-populate market_options when a market is created with JSONB options
CREATE OR REPLACE FUNCTION public.populate_market_options_from_jsonb()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.options IS NOT NULL AND jsonb_typeof(NEW.options) = 'array' AND jsonb_array_length(NEW.options) > 0 THEN
    INSERT INTO public.market_options (id, market_id, label, total_votes, total_credits, percentage)
    SELECT 
      CASE 
        WHEN (opt->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN (opt->>'id')::uuid
        ELSE gen_random_uuid()
      END,
      NEW.id,
      COALESCE(opt->>'label', ''),
      COALESCE((opt->>'votes')::integer, 0),
      COALESCE((opt->>'creditsAllocated')::integer, 0),
      COALESCE((opt->>'percentage')::numeric, 0)
    FROM jsonb_array_elements(NEW.options) opt;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_populate_market_options
AFTER INSERT ON public.markets
FOR EACH ROW EXECUTE FUNCTION public.populate_market_options_from_jsonb();

-- Update place_prediction to write to market_options instead of JSONB
CREATE OR REPLACE FUNCTION public.place_prediction(p_market_id uuid, p_selected_option text, p_credits integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_current_credits INTEGER;
  v_prediction_id UUID;
  v_market_status market_status;
  v_lock_date TIMESTAMPTZ;
  v_total_market_credits INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT status, lock_date INTO v_market_status, v_lock_date FROM public.markets WHERE id = p_market_id;
  IF v_market_status IS NULL THEN
    RAISE EXCEPTION 'Market not found';
  END IF;
  IF v_market_status != 'open' THEN
    RAISE EXCEPTION 'Market is not open';
  END IF;
  IF v_lock_date IS NOT NULL AND v_lock_date <= NOW() THEN
    RAISE EXCEPTION 'Market is locked for predictions';
  END IF;

  SELECT futra_credits INTO v_current_credits FROM public.profiles WHERE user_id = v_user_id;
  IF v_current_credits < p_credits THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  IF EXISTS (SELECT 1 FROM public.predictions WHERE user_id = v_user_id AND market_id = p_market_id) THEN
    RAISE EXCEPTION 'Already predicted on this market';
  END IF;

  -- Deduct credits
  UPDATE public.profiles SET futra_credits = futra_credits - p_credits, total_predictions = total_predictions + 1 WHERE user_id = v_user_id;

  -- Insert prediction
  INSERT INTO public.predictions (user_id, market_id, selected_option, credits_allocated)
  VALUES (v_user_id, p_market_id, p_selected_option, p_credits)
  RETURNING id INTO v_prediction_id;

  -- Update the selected market option
  UPDATE public.market_options
  SET total_votes = total_votes + 1,
      total_credits = total_credits + p_credits
  WHERE market_id = p_market_id AND id = p_selected_option::uuid;

  -- Recalculate percentages for all options
  SELECT COALESCE(SUM(total_credits), 0) INTO v_total_market_credits
  FROM public.market_options WHERE market_id = p_market_id;

  IF v_total_market_credits > 0 THEN
    UPDATE public.market_options
    SET percentage = ROUND((total_credits::numeric / v_total_market_credits) * 100, 1)
    WHERE market_id = p_market_id;
  END IF;

  -- Update market aggregate stats
  UPDATE public.markets
  SET total_credits = total_credits + p_credits,
      total_participants = total_participants + 1
  WHERE id = p_market_id;

  RETURN v_prediction_id;
END;
$$;

-- =============================================
-- TASK 6: Enable Realtime
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'markets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.markets;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'market_options') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.market_options;
  END IF;
END $$;

-- =============================================
-- TASK 8: Onboarding flag
-- =============================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
