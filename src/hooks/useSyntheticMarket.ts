/**
 * Hook to fetch and manage synthetic market data from the database.
 * Returns synthetic configs for enabled markets and provides CRUD operations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from './useAdmin';
import type { SyntheticConfig } from '@/lib/synthetic-engine';
import { DEFAULT_CONFIG } from '@/lib/synthetic-engine';

export interface SyntheticMarketRow {
  id: string;
  market_id: string;
  enabled: boolean;
  seed: number;
  config: SyntheticConfig;
  snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ['synthetic-market-data'];

export function useSyntheticMarkets() {
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase.from('synthetic_market_data') as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SyntheticMarketRow[];
    },
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const enabledMap = new Map<string, SyntheticMarketRow>();
  (query.data || []).forEach(row => {
    if (row.enabled) enabledMap.set(row.market_id, row);
  });

  const upsertMutation = useMutation({
    mutationFn: async (params: {
      market_id: string;
      enabled?: boolean;
      seed?: number;
      config?: Partial<SyntheticConfig>;
    }) => {
      // Check if exists
      const { data: existing } = await (supabase.from('synthetic_market_data') as any)
        .select('id, config')
        .eq('market_id', params.market_id)
        .maybeSingle();

      if (existing) {
        const updates: any = {};
        if (params.enabled !== undefined) updates.enabled = params.enabled;
        if (params.seed !== undefined) updates.seed = params.seed;
        if (params.config) updates.config = { ...existing.config, ...params.config };
        const { error } = await (supabase.from('synthetic_market_data') as any)
          .update(updates)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('synthetic_market_data') as any).insert({
          market_id: params.market_id,
          enabled: params.enabled ?? false,
          seed: params.seed ?? Math.floor(Math.random() * 2147483647),
          config: { ...DEFAULT_CONFIG, ...params.config },
        });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (marketId: string) => {
      const { error } = await (supabase.from('synthetic_market_data') as any)
        .delete()
        .eq('market_id', marketId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const resetAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('synthetic_market_data') as any)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    syntheticData: query.data || [],
    enabledMap,
    isLoading: query.isLoading,
    enabledCount: enabledMap.size,
    upsert: upsertMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    resetAll: resetAllMutation.mutateAsync,
    isPending: upsertMutation.isPending || deleteMutation.isPending || resetAllMutation.isPending,
  };
}
