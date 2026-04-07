
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
BEGIN
  SELECT total_predictions, resolved_predictions, streak, accuracy_rate, influence_level
  INTO v_profile
  FROM profiles WHERE user_id = p_user_id;

  IF v_profile IS NULL THEN RETURN; END IF;

  FOR v_ach IN SELECT * FROM achievements WHERE active = true LOOP
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

      WHEN 'elite_level' THEN
        v_met := v_profile.influence_level = 'elite';

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

-- Fix elite_level achievement to use the correct criteria_type
UPDATE achievements SET criteria_type = 'elite_level' WHERE key = 'elite_level';
