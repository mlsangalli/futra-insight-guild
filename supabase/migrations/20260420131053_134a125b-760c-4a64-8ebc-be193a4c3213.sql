-- Fix warning 1: analytics_events INSERT precisa amarrar user_id
DROP POLICY IF EXISTS "Authenticated users can insert events" ON public.analytics_events;

CREATE POLICY "Users insert own analytics events"
ON public.analytics_events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix warning 2: bucket market-images permite listagem
-- Solução: manter bucket "público" (URLs assinadas funcionam) mas
-- restringir SELECT por path conhecido apenas (sem wildcards)
-- Na prática: revoga a policy ampla e usa get_public_url do storage
-- (que não precisa de SELECT no objects).

DROP POLICY IF EXISTS "market-images public read by path" ON storage.objects;

-- Sem policy de SELECT pública: clientes não conseguem listar.
-- URLs públicas geradas via supabase.storage.from('market-images').getPublicUrl()
-- continuam funcionando porque o bucket está marcado como public=true
-- (o servidor de storage serve direto, sem passar por RLS de objects).
