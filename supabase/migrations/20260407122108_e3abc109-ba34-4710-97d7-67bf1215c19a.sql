CREATE OR REPLACE FUNCTION public.update_market_search_vector()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  NEW.search_vector := to_tsvector('portuguese',
    coalesce(NEW.question, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.category::text, ''));
  RETURN NEW;
END;
$$;

UPDATE markets SET search_vector = to_tsvector('portuguese',
  coalesce(question, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(category::text, ''));