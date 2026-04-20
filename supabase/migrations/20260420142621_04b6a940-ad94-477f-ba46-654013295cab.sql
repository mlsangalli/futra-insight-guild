
-- Tabela leve para tracking de falhas por mercado
CREATE TABLE IF NOT EXISTS public.market_resolution_attempts (
  market_id uuid PRIMARY KEY,
  failure_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  ai_gateway_paused_until timestamptz
);

ALTER TABLE public.market_resolution_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view resolution attempts"
ON public.market_resolution_attempts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Tabela singleton para circuit breaker GLOBAL do AI Gateway
CREATE TABLE IF NOT EXISTS public.ai_gateway_status (
  id integer PRIMARY KEY DEFAULT 1,
  paused_until timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton_row CHECK (id = 1)
);

INSERT INTO public.ai_gateway_status (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.ai_gateway_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view ai gateway status"
ON public.ai_gateway_status FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Index para rápido lookup de cooldowns
CREATE INDEX IF NOT EXISTS idx_market_resolution_attempts_last_attempt
ON public.market_resolution_attempts (last_attempt_at);
