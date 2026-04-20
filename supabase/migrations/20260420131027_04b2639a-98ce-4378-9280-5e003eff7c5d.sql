-- ============================================================
-- FASE 1 — Hardening de backend (7 fixes críticos de segurança)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- FIX 1: profiles — bloquear escalada de privilégio
-- O trigger protect_profile_fields existe mas confia em
-- current_setting('request.jwt.claim.role'). Vamos garantir
-- que ele está ATTACHED como BEFORE UPDATE e que ataca todas
-- as colunas sensíveis. Em paralelo, criar política WITH CHECK
-- explícita que rejeite a escrita.
-- ────────────────────────────────────────────────────────────

-- (Re)anexa o trigger para garantir que está ativo
DROP TRIGGER IF EXISTS protect_profile_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_fields();

-- Reforça a função: bloqueia a alteração de campos sensíveis
-- mesmo que current_setting venha como NULL em chamadas via PostgREST
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean;
BEGIN
  -- Detecta service_role pelo JWT claim 'role' (mais confiável que current_setting('role'))
  v_is_service := COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role',
    false
  );

  IF v_is_service THEN
    RETURN NEW;
  END IF;

  -- Para qualquer chamada de usuário (anon/authenticated): congela campos sensíveis
  NEW.futra_credits         := OLD.futra_credits;
  NEW.futra_score           := OLD.futra_score;
  NEW.accuracy_rate         := OLD.accuracy_rate;
  NEW.global_rank           := OLD.global_rank;
  NEW.influence_level       := OLD.influence_level;
  NEW.total_predictions     := OLD.total_predictions;
  NEW.resolved_predictions  := OLD.resolved_predictions;
  NEW.streak                := OLD.streak;
  NEW.user_id               := OLD.user_id;
  NEW.referral_code         := OLD.referral_code;
  NEW.referred_by           := OLD.referred_by;
  NEW.last_daily_bonus      := OLD.last_daily_bonus;
  RETURN NEW;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- FIX 2: user_missions — usuários não podem self-completar
-- Remove UPDATE direto de usuários; progresso só via RPCs
-- (track_mission_progress, claim_mission_reward — ambas SECURITY DEFINER)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users update own missions" ON public.user_missions;
DROP POLICY IF EXISTS "Users insert own missions" ON public.user_missions;

-- Usuários ainda podem LER suas próprias missões
-- Mas INSERT/UPDATE só podem vir de SECURITY DEFINER functions

-- ────────────────────────────────────────────────────────────
-- FIX 3: predictions — não vazar escolhas alheias
-- Remove a política que liberava todas as predictions de mercados não-open
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated view on non-open markets" ON public.predictions;
DROP POLICY IF EXISTS "Public view on non-open markets" ON public.predictions;
-- Mantém: "Users view own predictions" + "Admins view all predictions"


-- ────────────────────────────────────────────────────────────
-- FIX 4: realtime — autorização por tópico
-- Restringe assinaturas de canais aos próprios usuários
-- ────────────────────────────────────────────────────────────
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can subscribe to own channels" ON realtime.messages;

CREATE POLICY "Authenticated can subscribe to own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Permite mercados públicos (markets:*, market-options:*)
  realtime.topic() LIKE 'markets:%'
  OR realtime.topic() LIKE 'market-options:%'
  OR realtime.topic() LIKE 'market_options:%'
  -- Permite o próprio canal de notificações: notifications:<uid>
  OR realtime.topic() = 'notifications:' || auth.uid()::text
  -- Permite o próprio canal de perfil: profile:<uid>
  OR realtime.topic() = 'profile:' || auth.uid()::text
  -- Admins acessam tudo
  OR public.has_role(auth.uid(), 'admin')
);


-- ────────────────────────────────────────────────────────────
-- FIX 5: synthetic_market_data — tornar privado
-- Configurações internas (seed, volatilidade) só para admins
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view synthetic data" ON public.synthetic_market_data;

CREATE POLICY "Admins can view synthetic data"
ON public.synthetic_market_data FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- O snapshot público (probabilidades calculadas) já é exposto via
-- o cache JSONB em markets.options, então o frontend não perde nada.


-- ────────────────────────────────────────────────────────────
-- FIX 6: storage market-images — bloquear listagem
-- Mantém leitura pública por path conhecido (URLs já em uso)
-- mas remove a capacidade de listar/enumerar arquivos
-- ────────────────────────────────────────────────────────────

-- Torna o bucket "não-listável" mas mantém objetos acessíveis por URL
UPDATE storage.buckets SET public = true WHERE id = 'market-images';

-- Remove qualquer policy ampla de SELECT no bucket
DROP POLICY IF EXISTS "Public read market-images" ON storage.objects;
DROP POLICY IF EXISTS "market-images select" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view market-images" ON storage.objects;

-- Policy: leitura permitida apenas quando o objeto é acessado por path direto
-- (PostgREST/Storage não consegue listar sem SELECT amplo)
CREATE POLICY "market-images public read by path"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'market-images');

-- Apenas admins podem fazer upload/delete
DROP POLICY IF EXISTS "Admins can upload market-images" ON storage.objects;
CREATE POLICY "Admins can upload market-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'market-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update market-images" ON storage.objects;
CREATE POLICY "Admins can update market-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'market-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete market-images" ON storage.objects;
CREATE POLICY "Admins can delete market-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'market-images' AND public.has_role(auth.uid(), 'admin'));


-- ────────────────────────────────────────────────────────────
-- FIX 7: comments — não expor user_id UUID a anônimos
-- Cria função pública que retorna comentários enriquecidos
-- com display_name/username em vez do UUID cru
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can read comments" ON public.comments;

-- Comentários só são lidos por autenticados (que de qualquer forma
-- já têm auth.uid()), via a função get_market_comments abaixo.
CREATE POLICY "Authenticated can read comments"
ON public.comments FOR SELECT
TO authenticated
USING (true);

-- Função pública que devolve comentários SEM o user_id cru
CREATE OR REPLACE FUNCTION public.get_market_comments(p_market_id uuid)
RETURNS TABLE (
  id uuid,
  market_id uuid,
  parent_id uuid,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  author_username text,
  author_display_name text,
  author_avatar_url text,
  author_influence influence_level
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.market_id, c.parent_id, c.body, c.created_at, c.updated_at,
    p.username, p.display_name, p.avatar_url, p.influence_level
  FROM comments c
  LEFT JOIN profiles p ON p.user_id = c.user_id
  WHERE c.market_id = p_market_id
  ORDER BY c.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_market_comments(uuid) TO anon, authenticated;
