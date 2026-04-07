-- Add score_delta column
ALTER TABLE public.predictions ADD COLUMN score_delta integer DEFAULT NULL;

-- Replace resolve_market_and_score to capture score delta
CREATE OR REPLACE FUNCTION public.resolve_market_and_score(p_market_id uuid, p_winning_option uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_pool INTEGER; v_total_winning_credits INTEGER; v_winners_count INTEGER := 0;
  v_total_predictions INTEGER := 0; v_market_question TEXT; v_winning_label TEXT; rec RECORD; v_reward INTEGER;
  v_old_score INTEGER; v_new_score INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM markets WHERE id = p_market_id AND status != 'resolved') THEN RAISE EXCEPTION 'Market not found or already resolved'; END IF;
  IF NOT EXISTS (SELECT 1 FROM market_options WHERE id = p_winning_option AND market_id = p_market_id) THEN RAISE EXCEPTION 'Invalid winning option for this market'; END IF;
  SELECT question INTO v_market_question FROM markets WHERE id = p_market_id;
  SELECT label INTO v_winning_label FROM market_options WHERE id = p_winning_option;
  UPDATE markets SET status = 'resolved', resolved_option = p_winning_option::text WHERE id = p_market_id;
  SELECT COALESCE(SUM(credits_allocated), 0) INTO v_total_pool FROM predictions WHERE market_id = p_market_id;
  SELECT COALESCE(SUM(credits_allocated), 0) INTO v_total_winning_credits FROM predictions WHERE market_id = p_market_id AND selected_option = p_winning_option::text;
  SELECT COUNT(*) INTO v_total_predictions FROM predictions WHERE market_id = p_market_id;

  FOR rec IN SELECT id, user_id, credits_allocated FROM predictions WHERE market_id = p_market_id AND selected_option = p_winning_option::text LOOP
    v_reward := CASE WHEN v_total_winning_credits > 0 THEN FLOOR((rec.credits_allocated::numeric / v_total_winning_credits) * v_total_pool) ELSE 0 END;
    UPDATE predictions SET status = 'won', reward = v_reward WHERE id = rec.id;
    UPDATE profiles SET futra_credits = futra_credits + v_reward WHERE user_id = rec.user_id;
    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description) VALUES (rec.user_id, v_reward, 'prediction_won', p_market_id, 'Won: ' || v_market_question);
    INSERT INTO notifications (user_id, type, title, body, data) VALUES (rec.user_id, 'credits_won', 'You won ' || v_reward || ' credits!', 'Your prediction on "' || v_market_question || '" was correct. Result: ' || v_winning_label, jsonb_build_object('market_id', p_market_id, 'reward', v_reward));
    
    -- Capture score before recalculation
    SELECT futra_score INTO v_old_score FROM profiles WHERE user_id = rec.user_id;
    PERFORM calculate_user_scores(rec.user_id);
    SELECT futra_score INTO v_new_score FROM profiles WHERE user_id = rec.user_id;
    UPDATE predictions SET score_delta = v_new_score - v_old_score WHERE id = rec.id;
    
    v_winners_count := v_winners_count + 1;
  END LOOP;

  FOR rec IN SELECT DISTINCT id, user_id, credits_allocated FROM predictions WHERE market_id = p_market_id AND selected_option != p_winning_option::text LOOP
    UPDATE predictions SET status = 'lost', reward = 0 WHERE id = rec.id;
    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description) VALUES (rec.user_id, -rec.credits_allocated, 'prediction_lost', p_market_id, 'Lost: ' || v_market_question);
    INSERT INTO notifications (user_id, type, title, body, data) VALUES (rec.user_id, 'credits_lost', 'Market resolved', 'Your prediction on "' || v_market_question || '" was incorrect. Result: ' || v_winning_label, jsonb_build_object('market_id', p_market_id));
    
    -- Capture score before recalculation
    SELECT futra_score INTO v_old_score FROM profiles WHERE user_id = rec.user_id;
    PERFORM calculate_user_scores(rec.user_id);
    SELECT futra_score INTO v_new_score FROM profiles WHERE user_id = rec.user_id;
    UPDATE predictions SET score_delta = v_new_score - v_old_score WHERE id = rec.id;
  END LOOP;

  IF v_winners_count = 0 AND v_total_predictions > 0 THEN
    FOR rec IN SELECT id, user_id, credits_allocated FROM predictions WHERE market_id = p_market_id LOOP
      UPDATE profiles SET futra_credits = futra_credits + rec.credits_allocated WHERE user_id = rec.user_id;
      INSERT INTO credit_transactions (user_id, amount, type, reference_id, description) VALUES (rec.user_id, rec.credits_allocated, 'prediction_won', p_market_id, 'Refund: ' || v_market_question);
    END LOOP;
  END IF;

  PERFORM recalculate_global_ranks();
  RETURN jsonb_build_object('success', true, 'total_predictions', v_total_predictions, 'winners_count', v_winners_count, 'total_pool', v_total_pool, 'refunded', v_winners_count = 0 AND v_total_predictions > 0);
END;
$function$;