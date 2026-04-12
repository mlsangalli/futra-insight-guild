
CREATE OR REPLACE FUNCTION public.get_browse_sorted(p_sort text DEFAULT 'trending'::text, p_category market_category DEFAULT NULL::market_category, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, question text, description text, category market_category, type text, status market_status, options jsonb, total_participants integer, total_credits integer, end_date timestamp with time zone, created_at timestamp with time zone, resolution_source text, resolution_rules text, featured boolean, trending boolean, created_by uuid, lock_date timestamp with time zone, resolved_option text, priority_score integer, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_total bigint;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM markets m
  WHERE m.status != 'closed'
    AND (p_category IS NULL OR m.category = p_category);

  RETURN QUERY
  SELECT
    m.id, m.question, m.description, m.category, m.type, m.status, m.options,
    m.total_participants, m.total_credits, m.end_date, m.created_at,
    m.resolution_source, m.resolution_rules, m.featured, m.trending,
    m.created_by, m.lock_date, m.resolved_option,
    CASE p_sort
      WHEN 'trending' THEN
        COALESCE((SELECT COUNT(*)::int FROM predictions p WHERE p.market_id = m.id AND p.created_at > v_now - interval '48 hours'), 0) * 10
        + LEAST(m.total_participants, 100) * 2
        + LEAST(ln(GREATEST(m.total_credits, 1) + 1) * 10, 50)::int
        + CASE WHEN m.status = 'open' AND m.end_date <= v_now + interval '3 days' THEN 15 ELSE 0 END
        + CASE WHEN m.created_at > v_now - interval '3 days' THEN 10 ELSE 0 END
        + CASE WHEN m.trending THEN 25 ELSE 0 END
      WHEN 'popular' THEN
        m.total_participants * 3 + m.total_credits
      WHEN 'newest' THEN
        EXTRACT(EPOCH FROM m.created_at)::int
      WHEN 'ending' THEN
        -EXTRACT(EPOCH FROM m.end_date)::int
      ELSE 0
    END AS priority_score,
    v_total AS total_count
  FROM markets m
  WHERE m.status != 'closed'
    AND (p_category IS NULL OR m.category = p_category)
  ORDER BY priority_score DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;
