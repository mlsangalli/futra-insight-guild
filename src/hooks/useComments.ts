import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isOnCooldown } from '@/lib/rate-limiter';
import { useTrackMission } from '@/hooks/useMissions';

export interface Comment {
  id: string;
  market_id: string;
  user_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { username: string; display_name: string; avatar_url: string | null };
}

export function useComments(marketId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!marketId) return;
    const channel = supabase
      .channel(`comments-${marketId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `market_id=eq.${marketId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['comments', marketId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [marketId, queryClient]);

  return useQuery({
    queryKey: ['comments', marketId],
    queryFn: async () => {
      // RPC retorna comentários enriquecidos sem expor user_id cru
      const { data, error } = await supabase.rpc('get_market_comments', { p_market_id: marketId });
      if (error) throw error;
      return ((data || []) as Array<{
        id: string;
        market_id: string;
        parent_id: string | null;
        body: string;
        created_at: string;
        updated_at: string;
        author_username: string | null;
        author_display_name: string | null;
        author_avatar_url: string | null;
      }>).map(r => ({
        id: r.id,
        market_id: r.market_id,
        parent_id: r.parent_id,
        body: r.body,
        created_at: r.created_at,
        updated_at: r.updated_at,
        user_id: '', // intencionalmente vazio: não expor UUID
        profiles: {
          username: r.author_username || 'usuario',
          display_name: r.author_display_name || 'Usuário',
          avatar_url: r.author_avatar_url,
        },
      })) as Comment[];
    },
    enabled: !!marketId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const trackMission = useTrackMission();

  return useMutation({
    mutationFn: async ({ marketId, body, parentId }: { marketId: string; body: string; parentId?: string }) => {
      if (isOnCooldown('post-comment', 2000)) {
        throw new Error('Aguarde antes de enviar outro comentário.');
      }
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('comments')
        .insert({ market_id: marketId, user_id: user.id, body, parent_id: parentId || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.marketId] });
      trackMission.mutate({ actionType: 'comment' });
    },
    onError: (err: Error) => toast.error(err.message || 'Falha ao publicar comentário'),
  });
}
