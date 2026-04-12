-- Allow everyone to read synthetic_market_data (not just admins)
CREATE POLICY "Anyone can view synthetic data"
ON public.synthetic_market_data
FOR SELECT
TO public
USING (true);

-- Drop the admin-only select policy
DROP POLICY IF EXISTS "Admins can view synthetic data" ON public.synthetic_market_data;