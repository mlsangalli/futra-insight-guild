
-- Home feeds RPC: returns pre-scored markets for each section
CREATE OR REPLACE FUNCTION public.get_home_feeds()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_featured jsonb;
  v_trending jsonb;
  v_popular jsonb;
  v_ending jsonb;
  v_now timestamptz := now();
BEGIN
  -- Featured: flagged markets, sorted by engagement
  SELECT COALESCE(jsonb_agg(row_to_json(t.*) ORDER BY t.total_participants DESC, t.total_credits DESC), '[]'::jsonb)
  INTO v_featured
  FROM (
    SELECT id, question, description, category, type, status, options,
           total_participants, total_credits, end_date, created_at,
           resolution_source, resolution_rules, featured, trending,
           created_by, lock_date, resolved_option
    FROM markets
    WHERE featured = true AND status = 'open'
    ORDER BY total_participants DESC, total_credits DESC
    LIMIT 6
  ) t;

  -- Trending: computed score based on recent activity, participants, credits, urgency
  SELECT COALESCE(jsonb_agg(row_to_json(t.*) ORDER BY t.trending_score DESC), '[]'::jsonb)
  INTO v_trending
  FROM (
    SELECT m.id, m.question, m.description, m.category, m.type, m.status, m.options,
           m.total_participants, m.total_credits, m.end_date, m.created_at,
           m.resolution_source, m.resolution_rules, m.featured, m.trending,
           m.created_by, m.lock_date, m.resolved_option,
           (
             -- Recent activity (predictions in last 48h)
             COALESCE((SELECT COUNT(*) FROM predictions p WHERE p.market_id = m.id AND p.created_at > v_now - interval '48 hours'), 0) * 10
             -- Participants weight
             + LEAST(m.total_participants, 100) * 2
             -- Credits weight (log scale)
             + LEAST(ln(GREATEST(m.total_credits, 1) + 1) * 10, 50)::int
             -- Urgency bonus: closer to deadline = higher score
             + CASE
                 WHEN m.end_date <= v_now + interval '24 hours' THEN 30
                 WHEN m.end_date <= v_now + interval '3 days' THEN 15
                 WHEN m.end_date <= v_now + interval '7 days' THEN 5
                 ELSE 0
               END
             -- Freshness bonus
             + CASE
                 WHEN m.created_at > v_now - interval '24 hours' THEN 20
                 WHEN m.created_at > v_now - interval '3 days' THEN 10
                 ELSE 0
               END
             -- Manual trending flag bonus
             + CASE WHEN m.trending THEN 25 ELSE 0 END
           ) AS trending_score
    FROM markets m
    WHERE m.status = 'open'
    ORDER BY trending_score DESC
    LIMIT 6
  ) t;

  -- Popular: by engagement
  SELECT COALESCE(jsonb_agg(row_to_json(t.*) ORDER BY t.engagement_score DESC), '[]'::jsonb)
  INTO v_popular
  FROM (
    SELECT id, question, description, category, type, status, options,
           total_participants, total_credits, end_date, created_at,
           resolution_source, resolution_rules, featured, trending,
           created_by, lock_date, resolved_option,
           (total_participants * 3 + total_credits) AS engagement_score
    FROM markets
    WHERE status = 'open'
    ORDER BY engagement_score DESC
    LIMIT 6
  ) t;

  -- Ending soon: open markets closing within 3 days
  SELECT COALESCE(jsonb_agg(row_to_json(t.*) ORDER BY t.end_date ASC), '[]'::jsonb)
  INTO v_ending
  FROM (
    SELECT id, question, description, category, type, status, options,
           total_participants, total_credits, end_date, created_at,
           resolution_source, resolution_rules, featured, trending,
           created_by, lock_date, resolved_option
    FROM markets
    WHERE status = 'open' AND end_date > v_now AND end_date <= v_now + interval '3 days'
    ORDER BY end_date ASC
    LIMIT 6
  ) t;

  RETURN jsonb_build_object(
    'featured', v_featured,
    'trending', v_trending,
    'popular', v_popular,
    'ending_soon', v_ending
  );
END;
$$;

-- Browse sorted RPC: server-side sorting with pagination
CREATE OR REPLACE FUNCTION public.get_browse_sorted(
  p_sort text DEFAULT 'trending',
  p_category market_category DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  question text,
  description text,
  category market_category,
  type text,
  status market_status,
  options jsonb,
  total_participants int,
  total_credits int,
  end_date timestamptz,
  created_at timestamptz,
  resolution_source text,
  resolution_rules text,
  featured boolean,
  trending boolean,
  created_by uuid,
  lock_date timestamptz,
  resolved_option text,
  priority_score int,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now timestamptz := now();
  v_total bigint;
BEGIN
  -- Get total count for pagination
  SELECT COUNT(*) INTO v_total
  FROM markets m
  WHERE (p_category IS NULL OR m.category = p_category);

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
  WHERE (p_category IS NULL OR m.category = p_category)
  ORDER BY priority_score DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
