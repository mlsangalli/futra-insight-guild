import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeMarkets() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('markets-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'markets',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['markets'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'market_options',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['markets'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
}

export function useRealtimeMarket(marketId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!marketId) return;

    const channel = supabase
      .channel(`market-${marketId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'markets',
        filter: `id=eq.${marketId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['market', marketId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'market_options',
        filter: `market_id=eq.${marketId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['market', marketId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [marketId, queryClient]);
}
