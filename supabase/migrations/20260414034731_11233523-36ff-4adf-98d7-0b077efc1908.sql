
-- 1. Fix profiles: restrict full SELECT to owner + admins, create public view
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Owner can view own full profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create a public view with only non-sensitive fields
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id, user_id, username, display_name, avatar_url, bio,
  futra_score, accuracy_rate, global_rank, influence_level,
  total_predictions, resolved_predictions, streak, specialties,
  created_at, updated_at
FROM public.profiles;

-- Grant access to the view for anon and authenticated
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- 2. Fix predictions: restrict public view to authenticated only
DROP POLICY IF EXISTS "Public view on non-open markets" ON public.predictions;

CREATE POLICY "Authenticated view on non-open markets"
ON public.predictions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM markets
    WHERE markets.id = predictions.market_id
    AND markets.status <> 'open'::market_status
  )
);

-- 3. Fix analytics_events: tighten INSERT to authenticated only
DROP POLICY IF EXISTS "Anyone can insert events" ON public.analytics_events;

CREATE POLICY "Authenticated users can insert events"
ON public.analytics_events FOR INSERT
TO authenticated
WITH CHECK (true);
