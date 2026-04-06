
-- Improvement 3: Restrict market creation to admins only
DROP POLICY IF EXISTS "Authenticated users can create markets" ON public.markets;
CREATE POLICY "Only admins can create markets" ON public.markets
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Improvement 5: Prediction privacy — no front-running
DROP POLICY IF EXISTS "Anyone can view predictions on resolved markets" ON public.predictions;
DROP POLICY IF EXISTS "Users can view own predictions" ON public.predictions;
DROP POLICY IF EXISTS "Admins can view all predictions" ON public.predictions;

CREATE POLICY "Users view own predictions" ON public.predictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Public view on non-open markets" ON public.predictions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.markets
      WHERE markets.id = predictions.market_id
      AND markets.status != 'open'
    )
  );

CREATE POLICY "Admins view all predictions" ON public.predictions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
