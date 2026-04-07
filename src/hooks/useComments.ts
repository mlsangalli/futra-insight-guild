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
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('market_id', marketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Comment[];
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
