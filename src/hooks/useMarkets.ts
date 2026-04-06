import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMarkets, fetchMarketById, fetchLeaderboard, fetchProfile, fetchUserPredictions } from '@/lib/market-queries';
import type { Market, MarketOption } from '@/types';

// Re-export types for backward compat
export type { Market as DbMarket, MarketOption };

export function useMarkets(filters?: { category?: string; featured?: boolean; trending?: boolean; status?: string }) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['markets', filters],
    queryFn: async () => {
      const markets = await fetchMarkets(filters);
      // Seed individual market cache from list results
      markets.forEach(m => {
        queryClient.setQueryData(['market', m.id], m);
      });
      return markets;
    },
  });
}

export function useMarket(id: string) {
  return useQuery({
    queryKey: ['market', id],
    queryFn: () => fetchMarketById(id),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
    staleTime: 60_000,
  });
}

export function useProfile(username: string) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: () => fetchProfile(username),
    enabled: !!username,
    staleTime: 60_000,
  });
}

export function useUserPredictions(userId?: string) {
  return useQuery({
    queryKey: ['predictions', userId],
    queryFn: () => fetchUserPredictions(userId!),
    enabled: !!userId,
  });
}
