
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_period text DEFAULT 'all',
  p_category public.market_category DEFAULT null
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  influence_level public.influence_level,
  futra_score integer,
  accuracy_rate numeric,
  resolved_predictions bigint,
  total_predictions bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fast path: global ranking from profiles
  IF p_period = 'all' AND p_category IS NULL THEN
    RETURN QUERY
      SELECT
        p.id,
        p.user_id,
        p.username,
        p.display_name,
        p.avatar_url,
        p.influence_level,
        p.futra_score,
        p.accuracy_rate,
        p.resolved_predictions::bigint,
        p.total_predictions::bigint
      FROM profiles p
      ORDER BY p.futra_score DESC, p.accuracy_rate DESC
      LIMIT 50;
    RETURN;
  END IF;

  -- Filtered path: aggregate from predictions + markets
  RETURN QUERY
    WITH filtered AS (
      SELECT
        pr.user_id AS f_user_id,
        COUNT(*)::bigint AS f_total,
        COUNT(*) FILTER (WHERE pr.status IN ('won', 'lost'))::bigint AS f_resolved,
        COUNT(*) FILTER (WHERE pr.status = 'won')::bigint AS f_wins
      FROM predictions pr
      JOIN markets m ON m.id = pr.market_id
      WHERE
        (p_category IS NULL OR m.category = p_category)
        AND (
          p_period = 'all'
          OR (p_period = 'week' AND pr.created_at >= now() - interval '7 days')
          OR (p_period = 'month' AND pr.created_at >= now() - interval '30 days')
        )
      GROUP BY pr.user_id
    )
    SELECT
      p.id,
      p.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.influence_level,
      CASE
        WHEN f.f_resolved > 0
        THEN ROUND(((f.f_wins::numeric / f.f_resolved) * ln(f.f_resolved + 1)) * 100)::integer
        ELSE 0
      END AS futra_score,
      CASE
        WHEN f.f_resolved > 0
        THEN ROUND((f.f_wins::numeric / f.f_resolved) * 100, 2)
        ELSE 0
      END AS accuracy_rate,
      f.f_resolved AS resolved_predictions,
      f.f_total AS total_predictions
    FROM filtered f
    JOIN profiles p ON p.user_id = f.f_user_id
    ORDER BY futra_score DESC, accuracy_rate DESC
    LIMIT 50;
END;
$$;
