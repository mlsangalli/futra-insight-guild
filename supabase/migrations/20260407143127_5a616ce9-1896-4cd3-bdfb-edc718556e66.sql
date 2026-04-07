
-- Table: missions (static definitions)
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  period text NOT NULL,
  goal_value integer NOT NULL DEFAULT 1,
  reward_credits integer NOT NULL DEFAULT 0,
  reward_score integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Missions viewable by everyone"
  ON public.missions FOR SELECT TO public USING (true);

-- Table: user_missions (per-user per-period progress)
CREATE TABLE public.user_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  current_value integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id, period_start)
);

ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own missions"
  ON public.user_missions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own missions"
  ON public.user_missions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own missions"
  ON public.user_missions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_user_missions_user_period
  ON public.user_missions (user_id, period_start);

-- ============================================================
-- RPC: track_mission_progress
-- Called after user actions to increment mission progress
-- ============================================================
CREATE OR REPLACE FUNCTION public.track_mission_progress(
  p_action_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_today date;
  v_week_start date;
  v_mission RECORD;
  v_period_start date;
  v_new_value integer;
  v_goal integer;
  v_distinct_cats integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;

  v_today := (now() AT TIME ZONE 'UTC')::date;
  v_week_start := date_trunc('week', (now() AT TIME ZONE 'UTC'))::date;

  FOR v_mission IN
    SELECT id, period, goal_value, action_type
    FROM missions
    WHERE active = true AND action_type = p_action_type
  LOOP
    v_period_start := CASE WHEN v_mission.period = 'daily' THEN v_today ELSE v_week_start END;
    v_goal := v_mission.goal_value;

    -- Upsert progress row
    INSERT INTO user_missions (user_id, mission_id, period_start, current_value)
    VALUES (v_user_id, v_mission.id, v_period_start, 0)
    ON CONFLICT (user_id, mission_id, period_start) DO NOTHING;

    -- Special: category_diversity counts distinct categories this week
    IF p_action_type = 'category_diversity' THEN
      SELECT COUNT(DISTINCT m.category) INTO v_distinct_cats
      FROM predictions p
      JOIN markets m ON m.id = p.market_id
      WHERE p.user_id = v_user_id
        AND p.created_at >= v_week_start
        AND p.created_at < v_week_start + interval '7 days';

      UPDATE user_missions
      SET current_value = LEAST(v_distinct_cats, v_goal),
          completed = (v_distinct_cats >= v_goal),
          completed_at = CASE
            WHEN v_distinct_cats >= v_goal AND completed = false THEN now()
            ELSE completed_at
          END
      WHERE user_id = v_user_id
        AND mission_id = v_mission.id
        AND period_start = v_period_start
        AND claimed_at IS NULL;
    ELSE
      -- Standard increment
      UPDATE user_missions
      SET current_value = LEAST(current_value + 1, v_goal),
          completed = (LEAST(current_value + 1, v_goal) >= v_goal),
          completed_at = CASE
            WHEN LEAST(current_value + 1, v_goal) >= v_goal AND completed = false THEN now()
            ELSE completed_at
          END
      WHERE user_id = v_user_id
        AND mission_id = v_mission.id
        AND period_start = v_period_start
        AND claimed_at IS NULL;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- RPC: claim_mission_reward
-- Awards credits + score for a completed mission
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_mission_reward(
  p_user_mission_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_um RECORD;
  v_mission RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the row to prevent double claim
  SELECT * INTO v_um
  FROM user_missions
  WHERE id = p_user_mission_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_um IS NULL THEN
    RAISE EXCEPTION 'Mission progress not found';
  END IF;

  IF NOT v_um.completed THEN
    RAISE EXCEPTION 'Mission not completed';
  END IF;

  IF v_um.claimed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Reward already claimed';
  END IF;

  SELECT * INTO v_mission FROM missions WHERE id = v_um.mission_id;

  -- Award credits
  IF v_mission.reward_credits > 0 THEN
    UPDATE profiles
    SET futra_credits = futra_credits + v_mission.reward_credits
    WHERE user_id = v_user_id;

    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description)
    VALUES (v_user_id, v_mission.reward_credits, 'mission_reward', v_um.mission_id,
            'Missão: ' || v_mission.title);
  END IF;

  -- Award score
  IF v_mission.reward_score > 0 THEN
    UPDATE profiles
    SET futra_score = futra_score + v_mission.reward_score
    WHERE user_id = v_user_id;
  END IF;

  -- Mark claimed
  UPDATE user_missions SET claimed_at = now() WHERE id = p_user_mission_id;

  -- Notification
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_user_id,
    'mission_complete',
    'Missão concluída!',
    v_mission.title || ' — +' || v_mission.reward_credits || ' FC' ||
      CASE WHEN v_mission.reward_score > 0 THEN ', +' || v_mission.reward_score || ' score' ELSE '' END,
    jsonb_build_object('mission_id', v_um.mission_id, 'reward_credits', v_mission.reward_credits, 'reward_score', v_mission.reward_score)
  );

  RETURN jsonb_build_object(
    'success', true,
    'reward_credits', v_mission.reward_credits,
    'reward_score', v_mission.reward_score
  );
END;
$$;

-- ============================================================
-- Update resolve_market_and_score to track 'win' missions
-- ============================================================
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
