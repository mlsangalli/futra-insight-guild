
-- Table: achievements (static definitions)
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'award',
  category text NOT NULL DEFAULT 'milestone',
  rarity text NOT NULL DEFAULT 'common',
  criteria_type text NOT NULL,
  criteria_value integer NOT NULL DEFAULT 1,
  criteria_meta jsonb DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements viewable by everyone"
  ON public.achievements FOR SELECT
  TO public USING (true);

-- Table: user_achievements
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User achievements viewable by everyone"
  ON public.user_achievements FOR SELECT
  TO public USING (true);

CREATE POLICY "System can insert user achievements"
  ON public.user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RPC: check_achievements
CREATE OR REPLACE FUNCTION public.check_achievements(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ach RECORD;
  v_met boolean;
  v_wins integer;
  v_cat_wins integer;
  v_profile RECORD;
  v_referral_count integer;
  v_ach_name text;
BEGIN
  SELECT total_predictions, resolved_predictions, streak, accuracy_rate
  INTO v_profile
  FROM profiles WHERE user_id = p_user_id;

  IF v_profile IS NULL THEN RETURN; END IF;

  FOR v_ach IN SELECT * FROM achievements WHERE active = true LOOP
    -- Skip if already unlocked
    IF EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = v_ach.id) THEN
      CONTINUE;
    END IF;

    v_met := false;

    CASE v_ach.criteria_type
      WHEN 'first_prediction' THEN
        v_met := v_profile.total_predictions >= v_ach.criteria_value;

      WHEN 'wins_count' THEN
        SELECT COUNT(*) INTO v_wins FROM predictions WHERE user_id = p_user_id AND status = 'won';
        v_met := v_wins >= v_ach.criteria_value;

      WHEN 'resolved_count' THEN
        v_met := v_profile.resolved_predictions >= v_ach.criteria_value;

      WHEN 'streak_days' THEN
        v_met := v_profile.streak >= v_ach.criteria_value;

      WHEN 'category_expert' THEN
        SELECT COUNT(*) INTO v_cat_wins
        FROM predictions p
        JOIN markets m ON m.id = p.market_id
        WHERE p.user_id = p_user_id
          AND p.status = 'won'
          AND m.category = (v_ach.criteria_meta->>'category')::market_category;
        v_met := v_cat_wins >= v_ach.criteria_value;

      WHEN 'early_caller' THEN
        SELECT EXISTS (
          SELECT 1 FROM predictions p
          JOIN market_options mo ON mo.id = p.selected_option::uuid AND mo.market_id = p.market_id
          WHERE p.user_id = p_user_id
            AND p.status = 'won'
            AND mo.percentage < 20
        ) INTO v_met;

      WHEN 'contrarian' THEN
        SELECT EXISTS (
          SELECT 1 FROM predictions p
          JOIN market_options mo ON mo.id = p.selected_option::uuid AND mo.market_id = p.market_id
          WHERE p.user_id = p_user_id
            AND p.status = 'won'
            AND mo.percentage < 50
            AND mo.total_votes < (
              SELECT MAX(mo2.total_votes) FROM market_options mo2 WHERE mo2.market_id = p.market_id
            )
        ) INTO v_met;

      WHEN 'referral_count' THEN
        SELECT COUNT(*) INTO v_referral_count FROM profiles WHERE referred_by = p_user_id;
        v_met := v_referral_count >= v_ach.criteria_value;

      ELSE
        v_met := false;
    END CASE;

    IF v_met THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (p_user_id, v_ach.id)
      ON CONFLICT DO NOTHING;

      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (
        p_user_id,
        'achievement_unlocked',
        'Conquista desbloqueada!',
        v_ach.name || ' — ' || v_ach.description,
        jsonb_build_object('achievement_id', v_ach.id, 'achievement_key', v_ach.key, 'rarity', v_ach.rarity)
      );
    END IF;
  END LOOP;
END;
$$;

-- Update resolve_market_and_score to call check_achievements
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
  v_today date;
  v_week_start date;
  v_win_mission RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM markets WHERE id = p_market_id AND status != 'resolved') THEN RAISE EXCEPTION 'Market not found or already resolved'; END IF;
  IF NOT EXISTS (SELECT 1 FROM market_options WHERE id = p_winning_option AND market_id = p_market_id) THEN RAISE EXCEPTION 'Invalid winning option for this market'; END IF;
  SELECT question INTO v_market_question FROM markets WHERE id = p_market_id;
  SELECT label INTO v_winning_label FROM market_options WHERE id = p_winning_option;
  UPDATE markets SET status = 'resolved', resolved_option = p_winning_option::text WHERE id = p_market_id;
  SELECT COALESCE(SUM(credits_allocated), 0) INTO v_total_pool FROM predictions WHERE market_id = p_market_id;
  SELECT COALESCE(SUM(credits_allocated), 0) INTO v_total_winning_credits FROM predictions WHERE market_id = p_market_id AND selected_option = p_winning_option::text;
  SELECT COUNT(*) INTO v_total_predictions FROM predictions WHERE market_id = p_market_id;

  v_today := (now() AT TIME ZONE 'UTC')::date;
  v_week_start := date_trunc('week', (now() AT TIME ZONE 'UTC'))::date;

  FOR rec IN SELECT id, user_id, credits_allocated FROM predictions WHERE market_id = p_market_id AND selected_option = p_winning_option::text LOOP
    v_reward := CASE WHEN v_total_winning_credits > 0 THEN FLOOR((rec.credits_allocated::numeric / v_total_winning_credits) * v_total_pool) ELSE 0 END;
    UPDATE predictions SET status = 'won', reward = v_reward WHERE id = rec.id;
    UPDATE profiles SET futra_credits = futra_credits + v_reward WHERE user_id = rec.user_id;
    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description) VALUES (rec.user_id, v_reward, 'prediction_won', p_market_id, 'Won: ' || v_market_question);
    INSERT INTO notifications (user_id, type, title, body, data) VALUES (rec.user_id, 'credits_won', 'You won ' || v_reward || ' credits!', 'Your prediction on "' || v_market_question || '" was correct. Result: ' || v_winning_label, jsonb_build_object('market_id', p_market_id, 'reward', v_reward));
    
    SELECT futra_score INTO v_old_score FROM profiles WHERE user_id = rec.user_id;
    PERFORM calculate_user_scores(rec.user_id);
    SELECT futra_score INTO v_new_score FROM profiles WHERE user_id = rec.user_id;
    UPDATE predictions SET score_delta = v_new_score - v_old_score WHERE id = rec.id;

    -- Track win mission for this user
    FOR v_win_mission IN SELECT id AS m_id, period, goal_value FROM missions WHERE active = true AND action_type = 'win' LOOP
      INSERT INTO user_missions (user_id, mission_id, period_start, current_value)
      VALUES (rec.user_id, v_win_mission.m_id,
              CASE WHEN v_win_mission.period = 'daily' THEN v_today ELSE v_week_start END, 0)
      ON CONFLICT (user_id, mission_id, period_start) DO NOTHING;

      UPDATE user_missions
      SET current_value = LEAST(current_value + 1, v_win_mission.goal_value),
          completed = (LEAST(current_value + 1, v_win_mission.goal_value) >= v_win_mission.goal_value),
          completed_at = CASE
            WHEN LEAST(current_value + 1, v_win_mission.goal_value) >= v_win_mission.goal_value AND completed = false THEN now()
            ELSE completed_at
          END
      WHERE user_id = rec.user_id
        AND mission_id = v_win_mission.m_id
        AND period_start = CASE WHEN v_win_mission.period = 'daily' THEN v_today ELSE v_week_start END
        AND claimed_at IS NULL;
    END LOOP;

    -- Check achievements after scoring
    PERFORM check_achievements(rec.user_id);
    
    v_winners_count := v_winners_count + 1;
  END LOOP;

  FOR rec IN SELECT DISTINCT id, user_id, credits_allocated FROM predictions WHERE market_id = p_market_id AND selected_option != p_winning_option::text LOOP
    UPDATE predictions SET status = 'lost', reward = 0 WHERE id = rec.id;
    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description) VALUES (rec.user_id, -rec.credits_allocated, 'prediction_lost', p_market_id, 'Lost: ' || v_market_question);
    INSERT INTO notifications (user_id, type, title, body, data) VALUES (rec.user_id, 'credits_lost', 'Market resolved', 'Your prediction on "' || v_market_question || '" was incorrect. Result: ' || v_winning_label, jsonb_build_object('market_id', p_market_id));
    
    SELECT futra_score INTO v_old_score FROM profiles WHERE user_id = rec.user_id;
    PERFORM calculate_user_scores(rec.user_id);
    SELECT futra_score INTO v_new_score FROM profiles WHERE user_id = rec.user_id;
    UPDATE predictions SET score_delta = v_new_score - v_old_score WHERE id = rec.id;

    -- Check achievements for losers too (resolved_count, streak reset, etc.)
    PERFORM check_achievements(rec.user_id);
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
