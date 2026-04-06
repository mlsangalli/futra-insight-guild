-- Índices para as queries mais comuns do frontend
CREATE INDEX IF NOT EXISTS idx_markets_category ON public.markets (category);
CREATE INDEX IF NOT EXISTS idx_markets_featured ON public.markets (featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_markets_trending ON public.markets (trending) WHERE trending = true;
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON public.markets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_status_created ON public.markets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_score ON public.profiles (futra_score DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_user_created ON public.predictions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_options_market ON public.market_options (market_id);

-- Atualizar recalculate_global_ranks com critérios secundários
CREATE OR REPLACE FUNCTION public.recalculate_global_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET global_rank = ranked.new_rank,
      updated_at = now()
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             ORDER BY futra_score DESC,
                      accuracy_rate DESC,
                      total_predictions DESC
           ) AS new_rank
    FROM profiles
    WHERE total_predictions > 0
  ) AS ranked
  WHERE profiles.id = ranked.id;

  UPDATE profiles
  SET global_rank = 0,
      updated_at = now()
  WHERE total_predictions = 0 AND global_rank != 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_global_ranks() TO service_role;
