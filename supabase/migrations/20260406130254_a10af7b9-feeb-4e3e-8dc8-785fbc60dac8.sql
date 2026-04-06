
-- 1. PROFILES: Restrict UPDATE to user-editable fields only
DROP POLICY "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile safe fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a trigger to prevent users from modifying server-managed fields
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Preserve server-managed fields (cannot be changed by user)
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

CREATE TRIGGER protect_profile_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_fields();

-- 2. PREDICTIONS: Remove user UPDATE access entirely (handled by server-side RPC)
DROP POLICY "Users can update own predictions" ON public.predictions;

-- 3. MARKETS: Restrict creator UPDATE to safe fields only
DROP POLICY "Creators can update own markets" ON public.markets;

CREATE POLICY "Creators can update own market details"
ON public.markets
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Trigger to protect server-managed market fields from creator manipulation
CREATE OR REPLACE FUNCTION public.protect_market_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

CREATE TRIGGER protect_market_fields_trigger
BEFORE UPDATE ON public.markets
FOR EACH ROW
EXECUTE FUNCTION public.protect_market_fields();
