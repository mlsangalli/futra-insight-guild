-- Function: calculate_user_scores
CREATE OR REPLACE FUNCTION public.calculate_user_scores(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_resolved INTEGER;
  v_wins INTEGER;
  v_accuracy NUMERIC;
  v_streak INTEGER := 0;
  v_score INTEGER;
  v_influence TEXT;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO v_total FROM predictions WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO v_resolved FROM predictions WHERE user_id = target_user_id AND status IN ('won', 'lost');
  SELECT COUNT(*) INTO v_wins FROM predictions WHERE user_id = target_user_id AND status = 'won';

  v_accuracy := CASE WHEN v_resolved > 0 THEN ROUND((v_wins::numeric / v_resolved) * 100, 2) ELSE 0 END;

  -- Calculate current win streak
  FOR rec IN SELECT status FROM predictions WHERE user_id = target_user_id AND status IN ('won', 'lost') ORDER BY updated_at DESC LOOP
    IF rec.status = 'won' THEN
      v_streak := v_streak + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  v_score := ROUND(v_resolved * v_accuracy);
  v_influence := CASE
    WHEN v_score >= 5000 THEN 'elite'
    WHEN v_score >= 2000 THEN 'high'
    WHEN v_score >= 500 THEN 'medium'
    ELSE 'low'
  END;

  UPDATE profiles SET
    total_predictions = v_total,
    resolved_predictions = v_resolved,
    accuracy_rate = v_accuracy,
    streak = v_streak,
    futra_score = v_score,
    influence_level = v_influence::influence_level
  WHERE user_id = target_user_id;
END;
$$;

-- Function: resolve_market_and_score
CREATE OR REPLACE FUNCTION public.resolve_market_and_score(p_market_id UUID, p_winning_option UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_pool INTEGER;
  v_total_winning_credits INTEGER;
  v_winners_count INTEGER := 0;
  v_total_predictions INTEGER := 0;
  rec RECORD;
  v_reward INTEGER;
BEGIN
  -- Validate market
  IF NOT EXISTS (SELECT 1 FROM markets WHERE id = p_market_id AND status != 'resolved') THEN
    RAISE EXCEPTION 'Market not found or already resolved';
  END IF;

  -- Validate winning option
  IF NOT EXISTS (SELECT 1 FROM market_options WHERE id = p_winning_option AND market_id = p_market_id) THEN
    RAISE EXCEPTION 'Invalid winning option for this market';
  END IF;

  -- Resolve market
  UPDATE markets SET status = 'resolved', resolved_option = p_winning_option::text WHERE id = p_market_id;

  -- Calculate pool
  SELECT COALESCE(SUM(credits_allocated), 0) INTO v_total_pool FROM predictions WHERE market_id = p_market_id;
  SELECT COALESCE(SUM(credits_allocated), 0) INTO v_total_winning_credits FROM predictions WHERE market_id = p_market_id AND selected_option = p_winning_option::text;
  SELECT COUNT(*) INTO v_total_predictions FROM predictions WHERE market_id = p_market_id;

  -- Update winners
  FOR rec IN SELECT id, user_id, credits_allocated FROM predictions WHERE market_id = p_market_id AND selected_option = p_winning_option::text LOOP
    v_reward := CASE WHEN v_total_winning_credits > 0 THEN FLOOR((rec.credits_allocated::numeric / v_total_winning_credits) * v_total_pool) ELSE 0 END;
    UPDATE predictions SET status = 'won', reward = v_reward WHERE id = rec.id;
    UPDATE profiles SET futra_credits = futra_credits + v_reward WHERE user_id = rec.user_id;
    PERFORM calculate_user_scores(rec.user_id);
    v_winners_count := v_winners_count + 1;
  END LOOP;

  -- Update losers
  UPDATE predictions SET status = 'lost', reward = 0 WHERE market_id = p_market_id AND selected_option != p_winning_option::text;

  -- Recalculate scores for losers
  FOR rec IN SELECT DISTINCT user_id FROM predictions WHERE market_id = p_market_id AND selected_option != p_winning_option::text LOOP
    PERFORM calculate_user_scores(rec.user_id);
  END LOOP;

  -- If no winners, refund everyone
  IF v_winners_count = 0 AND v_total_predictions > 0 THEN
    FOR rec IN SELECT id, user_id, credits_allocated FROM predictions WHERE market_id = p_market_id LOOP
      UPDATE profiles SET futra_credits = futra_credits + rec.credits_allocated WHERE user_id = rec.user_id;
    END LOOP;
  END IF;

  -- Recalculate global ranks
  PERFORM recalculate_global_ranks();

  RETURN jsonb_build_object(
    'success', true,
    'total_predictions', v_total_predictions,
    'winners_count', v_winners_count,
    'total_pool', v_total_pool,
    'refunded', v_winners_count = 0 AND v_total_predictions > 0
  );
END;
$$;

-- Additional RLS: users can see predictions on resolved markets
CREATE POLICY "Anyone can view predictions on resolved markets"
ON public.predictions
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM markets WHERE markets.id = predictions.market_id AND markets.status = 'resolved')
);

-- Allow users to update own predictions only if market is still open
CREATE POLICY "Users can update own predictions on open markets"
ON public.predictions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM markets WHERE markets.id = predictions.market_id AND markets.status = 'open'))
WITH CHECK (auth.uid() = user_id);
