CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow service-role and DB function callers to modify all fields
  IF current_setting('role', true) = 'service_role' 
     OR current_setting('request.jwt.claim.role', true) IS NULL THEN
    RETURN NEW;
  END IF;

  -- For regular users: preserve server-managed fields
  NEW.futra_credits := OLD.futra_credits;
  NEW.futra_score := OLD.futra_score;
  NEW.accuracy_rate := OLD.accuracy_rate;
  NEW.global_rank := OLD.global_rank;
  NEW.influence_level := OLD.influence_level;
  NEW.total_predictions := OLD.total_predictions;
  NEW.resolved_predictions := OLD.resolved_predictions;
  NEW.streak := OLD.streak;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;