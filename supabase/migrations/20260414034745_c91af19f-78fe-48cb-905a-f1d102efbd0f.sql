
-- Fix security definer view issue
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  id, user_id, username, display_name, avatar_url, bio,
  futra_score, accuracy_rate, global_rank, influence_level,
  total_predictions, resolved_predictions, streak, specialties,
  created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;
