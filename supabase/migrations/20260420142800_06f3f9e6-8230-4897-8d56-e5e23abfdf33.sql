
CREATE OR REPLACE FUNCTION public.record_market_resolution_failure(
  p_market_id uuid,
  p_error text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.market_resolution_attempts (market_id, failure_count, last_attempt_at, last_error)
  VALUES (p_market_id, 1, now(), p_error)
  ON CONFLICT (market_id) DO UPDATE
    SET failure_count = market_resolution_attempts.failure_count + 1,
        last_attempt_at = now(),
        last_error = EXCLUDED.last_error;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_market_resolution_attempts(p_market_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.market_resolution_attempts WHERE market_id = p_market_id;
END;
$$;
