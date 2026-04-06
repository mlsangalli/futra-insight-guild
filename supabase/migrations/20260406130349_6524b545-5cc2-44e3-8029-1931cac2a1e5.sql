
-- Fix INSERT policies to target authenticated role only
DROP POLICY "Users can insert own profile" ON public.profiles;
CREATE POLICY "Authenticated users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can create own predictions" ON public.predictions;
CREATE POLICY "Authenticated users can create own predictions"
ON public.predictions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also fix markets INSERT
DROP POLICY "Authenticated users can create markets" ON public.markets;
CREATE POLICY "Authenticated users can create markets"
ON public.markets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
