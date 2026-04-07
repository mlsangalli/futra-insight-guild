
CREATE OR REPLACE FUNCTION public.calculate_user_scores(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  FOR rec IN SELECT status FROM predictions WHERE user_id = target_user_id AND status IN ('won', 'lost') ORDER BY updated_at DESC LOOP
    IF rec.status = 'won' THEN
      v_streak := v_streak + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  v_score := ROUND((v_accuracy / 100.0) * ln(v_resolved + 1) * 100);
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
$function$;
