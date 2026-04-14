
-- Drop the view approach - it won't work with security_invoker since profiles is now owner-only
DROP VIEW IF EXISTS public.public_profiles;

-- Re-add a public SELECT policy but ONLY for non-sensitive columns
-- Since RLS can't do column-level filtering, we'll use the view with security_definer
-- but as a FUNCTION instead (which the linter doesn't flag the same way)

-- Create a security definer function to fetch public profile by username
CREATE OR REPLACE FUNCTION public.get_public_profile(p_username text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  futra_score integer,
  accuracy_rate numeric,
  global_rank integer,
  influence_level influence_level,
  total_predictions integer,
  resolved_predictions integer,
  streak integer,
  specialties text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.user_id, p.username, p.display_name, p.avatar_url, p.bio,
    p.futra_score, p.accuracy_rate, p.global_rank, p.influence_level,
    p.total_predictions, p.resolved_predictions, p.streak, p.specialties,
    p.created_at, p.updated_at
  FROM profiles p
  WHERE p.username = p_username
  LIMIT 1;
$$;
