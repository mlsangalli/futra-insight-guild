CREATE OR REPLACE FUNCTION public.get_flow_feed(p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, question text, description text, category market_category, type text, status market_status, options jsonb, total_participants integer, total_credits integer, end_date timestamp with time zone, lock_date timestamp with time zone, created_at timestamp with time zone, image_url text, image_alt text, resolution_source text, flow_score integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_now timestamptz := now();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  RETURN QUERY
  SELECT
    m.id, m.question, m.description, m.category, m.type, m.status, m.options,
    m.total_participants, m.total_credits, m.end_date, m.lock_date, m.created_at,
    m.image_url, m.image_alt, m.resolution_source,
    (
      COALESCE((SELECT COUNT(*)::int FROM predictions p
                WHERE p.market_id = m.id AND p.created_at > v_now - interval '48 hours'), 0) * 8
      + LEAST(m.total_participants, 200) * 2
      + LEAST(ln(GREATEST(m.total_credits, 1) + 1) * 10, 60)::int
      + CASE
          WHEN m.lock_date <= v_now + interval '24 hours' THEN 35
          WHEN m.lock_date <= v_now + interval '3 days' THEN 18
          WHEN m.lock_date <= v_now + interval '7 days' THEN 8
          ELSE 0
        END
      + CASE
          WHEN m.created_at > v_now - interval '24 hours' THEN 30
          WHEN m.created_at > v_now - interval '3 days' THEN 15
          WHEN m.created_at > v_now - interval '7 days' THEN 5
          ELSE 0
        END
      + CASE WHEN m.featured THEN 20 ELSE 0 END
      + CASE WHEN m.trending THEN 15 ELSE 0 END
      + CASE
          WHEN m.category::text = ANY(
            SELECT unnest(specialties) FROM profiles WHERE user_id = v_user
          ) THEN 12
          ELSE 0
        END
    )::int AS flow_score
  FROM markets m
  WHERE m.status = 'open'
    AND (m.lock_date IS NULL OR m.lock_date > v_now)
    AND NOT EXISTS (
      SELECT 1 FROM predictions p
      WHERE p.market_id = m.id AND p.user_id = v_user
    )
    AND NOT EXISTS (
      SELECT 1 FROM flow_skips fs
      WHERE fs.market_id = m.id
        AND fs.user_id = v_user
        AND fs.skipped_at > v_now - interval '7 days'
    )
  ORDER BY flow_score DESC, m.created_at DESC
  LIMIT GREATEST(p_limit, 1);
END;
$function$;