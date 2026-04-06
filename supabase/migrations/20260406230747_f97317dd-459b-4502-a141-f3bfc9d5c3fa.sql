CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name text NOT NULL,
  user_id uuid DEFAULT NULL,
  properties jsonb DEFAULT '{}',
  url text,
  referrer text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can read events"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_analytics_event_name ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX idx_analytics_user ON public.analytics_events (user_id, created_at DESC);