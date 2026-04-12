
CREATE TABLE public.synthetic_market_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id uuid NOT NULL UNIQUE REFERENCES public.markets(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  seed integer NOT NULL DEFAULT floor(random() * 2147483647)::integer,
  config jsonb NOT NULL DEFAULT '{
    "initial_probability": 50,
    "volatility": 0.3,
    "volume_base": 100,
    "growth_rate": 1.0,
    "priority_level": 1,
    "mode": "static"
  }'::jsonb,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.synthetic_market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view synthetic data"
  ON public.synthetic_market_data FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert synthetic data"
  ON public.synthetic_market_data FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update synthetic data"
  ON public.synthetic_market_data FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete synthetic data"
  ON public.synthetic_market_data FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_synthetic_market_data_updated_at
  BEFORE UPDATE ON public.synthetic_market_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
