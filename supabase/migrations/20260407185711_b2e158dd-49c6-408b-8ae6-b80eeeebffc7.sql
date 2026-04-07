
-- Enable required extensions for cron and HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE public.scheduled_markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_topic text NOT NULL,
  topic_hash text NOT NULL,
  market_id uuid REFERENCES public.markets(id),
  category public.market_category NOT NULL,
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(topic_hash)
);

ALTER TABLE public.scheduled_markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view scheduled_markets"
  ON public.scheduled_markets
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert scheduled_markets"
  ON public.scheduled_markets
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete scheduled_markets"
  ON public.scheduled_markets
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
