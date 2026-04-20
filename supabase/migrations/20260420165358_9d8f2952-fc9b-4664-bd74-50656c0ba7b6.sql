-- ============================================================
-- FUTRA Flow: skips, sessions, conviction
-- ============================================================

-- 1) flow_skips: mercados pulados (swipe up)
CREATE TABLE IF NOT EXISTS public.flow_skips (
  user_id uuid NOT NULL,
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  skipped_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, market_id)
);

CREATE INDEX IF NOT EXISTS idx_flow_skips_user_recent
  ON public.flow_skips (user_id, skipped_at DESC);

ALTER TABLE public.flow_skips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own flow skips"
  ON public.flow_skips
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) flow_sessions: telemetria de sessões
CREATE TABLE IF NOT EXISTS public.flow_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  cards_viewed integer NOT NULL DEFAULT 0,
  cards_answered integer NOT NULL DEFAULT 0,
  cards_skipped integer NOT NULL DEFAULT 0,
  cards_shared integer NOT NULL DEFAULT 0,
  total_credits_invested integer NOT NULL DEFAULT 0,
  device_type text NOT NULL DEFAULT 'unknown'
);

CREATE INDEX IF NOT EXISTS idx_flow_sessions_user_started
  ON public.flow_sessions (user_id, started_at DESC);

ALTER TABLE public.flow_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own flow sessions"
  ON public.flow_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own flow sessions"
  ON public.flow_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own flow sessions"
  ON public.flow_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all flow sessions"
  ON public.flow_sessions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) prediction_conviction: nível de convicção opcional
CREATE TABLE IF NOT EXISTS public.prediction_conviction (
  prediction_id uuid PRIMARY KEY REFERENCES public.predictions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  level text NOT NULL CHECK (level IN ('low','medium','high')),
  source text NOT NULL DEFAULT 'flow',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conviction_user
  ON public.prediction_conviction (user_id);

ALTER TABLE public.prediction_conviction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own conviction"
  ON public.prediction_conviction
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own conviction"
  ON public.prediction_conviction
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all conviction"
  ON public.prediction_conviction
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- RPC: get_flow_feed
-- Mercados priorizados para o usuário no Flow
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_flow_feed(p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  question text,
  description text,
  category market_category,
  type text,
  status market_status,
  options jsonb,
  total_participants integer,
  total_credits integer,
  end_date timestamptz,
  lock_date timestamptz,
  created_at timestamptz,
  image_url text,
  image_alt text,
  resolution_source text,
  flow_score integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
      -- Atividade recente (últimas 48h)
      COALESCE((SELECT COUNT(*) FROM predictions p
                WHERE p.market_id = m.id AND p.created_at > v_now - interval '48 hours'), 0) * 8
      -- Engajamento social
      + LEAST(m.total_participants, 200) * 2
      + LEAST(ln(GREATEST(m.total_credits, 1) + 1) * 10, 60)::int
      -- Urgência
      + CASE
          WHEN m.lock_date <= v_now + interval '24 hours' THEN 35
          WHEN m.lock_date <= v_now + interval '3 days' THEN 18
          WHEN m.lock_date <= v_now + interval '7 days' THEN 8
          ELSE 0
        END
      -- Novidade
      + CASE
          WHEN m.created_at > v_now - interval '24 hours' THEN 30
          WHEN m.created_at > v_now - interval '3 days' THEN 15
          WHEN m.created_at > v_now - interval '7 days' THEN 5
          ELSE 0
        END
      + CASE WHEN m.featured THEN 20 ELSE 0 END
      + CASE WHEN m.trending THEN 15 ELSE 0 END
      -- Boost se categoria está nas especialidades do usuário
      + CASE
          WHEN m.category::text = ANY(
            SELECT unnest(specialties) FROM profiles WHERE user_id = v_user
          ) THEN 12
          ELSE 0
        END
    ) AS flow_score
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
$$;

-- ============================================================
-- RPC: record_flow_skip
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_flow_skip(p_market_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM markets WHERE id = p_market_id) THEN
    RAISE EXCEPTION 'Mercado não encontrado';
  END IF;

  INSERT INTO flow_skips (user_id, market_id, skipped_at)
  VALUES (v_user, p_market_id, now())
  ON CONFLICT (user_id, market_id)
  DO UPDATE SET skipped_at = EXCLUDED.skipped_at;
END;
$$;

-- ============================================================
-- RPC: record_prediction_conviction
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_prediction_conviction(
  p_prediction_id uuid,
  p_level text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_pred_user uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  IF p_level NOT IN ('low','medium','high') THEN
    RAISE EXCEPTION 'Nível de convicção inválido';
  END IF;

  SELECT user_id INTO v_pred_user FROM predictions WHERE id = p_prediction_id;
  IF v_pred_user IS NULL THEN
    RAISE EXCEPTION 'Previsão não encontrada';
  END IF;
  IF v_pred_user <> v_user THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  INSERT INTO prediction_conviction (prediction_id, user_id, level, source)
  VALUES (p_prediction_id, v_user, p_level, 'flow')
  ON CONFLICT (prediction_id) DO NOTHING;
END;
$$;

-- ============================================================
-- RPC: get_flow_stats
-- Estatísticas Flow do usuário para perfil
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_flow_stats(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := COALESCE(p_user_id, auth.uid());
  v_total_sessions integer;
  v_total_answered integer;
  v_total_skipped integer;
  v_avg_per_session numeric;
  v_best_category text;
  v_last_session timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('error','not authenticated');
  END IF;

  SELECT COUNT(*), COALESCE(SUM(cards_answered),0), COALESCE(SUM(cards_skipped),0),
         CASE WHEN COUNT(*)>0 THEN ROUND(AVG(cards_answered)::numeric, 1) ELSE 0 END,
         MAX(started_at)
  INTO v_total_sessions, v_total_answered, v_total_skipped, v_avg_per_session, v_last_session
  FROM flow_sessions
  WHERE user_id = v_user;

  SELECT m.category::text INTO v_best_category
  FROM predictions p
  JOIN markets m ON m.id = p.market_id
  WHERE p.user_id = v_user AND p.status = 'won'
  GROUP BY m.category
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'total_sessions', v_total_sessions,
    'total_answered', v_total_answered,
    'total_skipped', v_total_skipped,
    'avg_per_session', v_avg_per_session,
    'best_category', v_best_category,
    'last_session', v_last_session
  );
END;
$$;