
-- Drop the overly permissive SELECT policy on predictions
DROP POLICY "Predictions are viewable by everyone" ON public.predictions;

-- Create a restrictive policy: users can only see their own predictions
CREATE POLICY "Users can view own predictions"
ON public.predictions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
