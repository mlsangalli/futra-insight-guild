import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
        .select('*, profiles!comments_user_id_fkey(username, display_name, avatar_url)')
        .eq('market_id', marketId)
        .order('created_at', { ascending: true });
      if (error) {
        // Fallback without join if FK doesn't exist
        const { data: fallback, error: err2 } = await supabase
          .from('comments')
          .select('*')
          .eq('market_id', marketId)
          .order('created_at', { ascending: true });
        if (err2) throw err2;
        return (fallback || []) as Comment[];
      }
      return (data || []) as Comment[];
    },
    enabled: !!marketId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ marketId, body, parentId }: { marketId: string; body: string; parentId?: string }) => {
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
    },
    onError: () => toast.error('Failed to post comment'),
  });
}
