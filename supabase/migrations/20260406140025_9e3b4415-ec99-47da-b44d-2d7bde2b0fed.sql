CREATE OR REPLACE FUNCTION public.recalculate_global_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET global_rank = sub.rank
  FROM (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY futra_score DESC, resolved_predictions DESC) as rank
    FROM profiles
  ) sub
  WHERE profiles.user_id = sub.user_id;
END;
$$;