-- Remove predictions from realtime (privacy fix)
ALTER PUBLICATION supabase_realtime DROP TABLE public.predictions;

-- Sanitize market inserts for non-admin users
CREATE OR REPLACE FUNCTION public.sanitize_market_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.featured := false;
    NEW.trending := false;
    NEW.total_credits := 0;
    NEW.total_participants := 0;
    NEW.status := 'open';
    NEW.resolved_option := NULL;
  END IF;
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sanitize_market_insert
BEFORE INSERT ON public.markets
FOR EACH ROW EXECUTE FUNCTION public.sanitize_market_insert();