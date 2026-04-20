-- 1) user_achievements: retirar leitura anônima
DROP POLICY IF EXISTS "User achievements viewable by everyone" ON public.user_achievements;

CREATE POLICY "Authenticated can view user achievements"
ON public.user_achievements FOR SELECT
TO authenticated
USING (true);

-- 2) comments: retirar leitura direta (usar apenas RPC get_market_comments)
DROP POLICY IF EXISTS "Authenticated can read comments" ON public.comments;

-- Acesso de leitura agora ocorre exclusivamente via SECURITY DEFINER function.
-- O autor ainda consegue ler/editar via "Users edit own comments" (que requer SELECT
-- via RETURNING — então adicionamos uma policy mínima de owner-read).
CREATE POLICY "Users read own comments"
ON public.comments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins leem tudo
CREATE POLICY "Admins read all comments"
ON public.comments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3) Realtime: liberar canal de comentários por mercado
DROP POLICY IF EXISTS "Authenticated can subscribe to own channels" ON realtime.messages;

CREATE POLICY "Authenticated can subscribe to allowed channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'markets:%'
  OR realtime.topic() LIKE 'market-options:%'
  OR realtime.topic() LIKE 'market_options:%'
  OR realtime.topic() LIKE 'comments-%'
  OR realtime.topic() = 'notifications:' || auth.uid()::text
  OR realtime.topic() = 'profile:' || auth.uid()::text
  OR public.has_role(auth.uid(), 'admin')
);
