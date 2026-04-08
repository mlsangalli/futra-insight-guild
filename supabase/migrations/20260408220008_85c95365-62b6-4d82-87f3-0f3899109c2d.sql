
DROP POLICY IF EXISTS "Authenticated users can suggest markets" ON public.scheduled_markets;

-- The existing "Admins insert scheduled_markets" policy already covers admin inserts.
