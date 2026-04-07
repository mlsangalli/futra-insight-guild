import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Market, MarketOption } from '@/types';
import { useTrackMission } from '@/hooks/useMissions';

function parseRow(row: any): Market {
  const rawOptions = row.markets?.market_options || row.markets?.options || [];
  const options: MarketOption[] = rawOptions.map((o: any) => ({
    id: o.id, label: o.label,
    votes: o.total_votes ?? o.votes ?? 0,
    creditsAllocated: o.total_credits ?? o.creditsAllocated ?? 0,
    percentage: Number(o.percentage) || 0,
  }));
  return { ...row.markets, options };
}

export function useWatchlist() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('watchlist')
        .select('*, markets(*, market_options(*))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(parseRow);
    },
    enabled: !!user,
  });
}

export function useIsWatching(marketId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['watching', marketId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('watchlist')
        .select('id')
        .eq('market_id', marketId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!marketId,
  });
}

export function useToggleWatchlist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const trackMission = useTrackMission();

  return useMutation({
    mutationFn: async (marketId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { data: existing } = await supabase
        .from('watchlist')
        .select('id')
        .eq('market_id', marketId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from('watchlist').delete().eq('id', existing.id);
        if (error) throw error;
        return { added: false };
      } else {
        const { error } = await supabase.from('watchlist').insert({ user_id: user.id, market_id: marketId });
        if (error) throw error;
        return { added: true };
      }
    },
    onSuccess: (result, marketId) => {
      toast.success(result.added ? 'Adicionado à watchlist' : 'Removido da watchlist');
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['watching', marketId] });
      if (result.added) {
        trackMission.mutate({ actionType: 'watchlist' });
      }
    },
    onError: () => toast.error('Falha ao atualizar watchlist'),
  });
}
