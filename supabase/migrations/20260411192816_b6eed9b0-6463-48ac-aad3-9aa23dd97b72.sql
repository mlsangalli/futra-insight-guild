CREATE OR REPLACE FUNCTION public.protect_market_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow service-role and DB function callers to modify all fields
  IF current_setting('role', true) = 'service_role' 
     OR current_setting('request.jwt.claim.role', true) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only admins can change resolution and status fields
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status := OLD.status;
    NEW.resolved_option := OLD.resolved_option;
    NEW.featured := OLD.featured;
    NEW.trending := OLD.trending;
    NEW.total_credits := OLD.total_credits;
    NEW.total_participants := OLD.total_participants;
    NEW.options := OLD.options;
  END IF;
  NEW.created_by := OLD.created_by;
  RETURN NEW;
END;
$function$;