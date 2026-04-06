import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { fetchMarkets, fetchAllMarkets, fetchMarketById, fetchLeaderboard, fetchProfile, fetchUserPredictions } from '@/lib/market-queries';
import type { Market, MarketOption } from '@/types';

// Re-export types for backward compat
export type { Market as DbMarket, MarketOption };

/** Non-paginated query for Home sections (trending, featured, etc.) */
export function useMarkets(filters?: { category?: string; featured?: boolean; trending?: boolean; status?: string }) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['markets', filters],
    queryFn: async () => {
      const markets = await fetchAllMarkets(filters);
      markets.forEach(m => {
        queryClient.setQueryData(['market', m.id], m);
      });
      return markets;
    },
  });
}

/** Paginated infinite query for Browse/Category pages */
export function useMarketsInfinite(filters: {
  category?: string;
  featured?: boolean;
  trending?: boolean;
  status?: string;
} = {}) {
  return useInfiniteQuery({
    queryKey: ['markets', 'infinite', filters],
    queryFn: ({ pageParam }) => fetchMarkets({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
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
