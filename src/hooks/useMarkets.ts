import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { fetchMarkets, fetchAllMarkets, fetchMarketById, fetchLeaderboard, fetchProfile, fetchUserPredictions, fetchHomeFeeds, fetchBrowseSorted } from '@/lib/market-queries';
import type { Market, MarketOption } from '@/types';

// Re-export types for backward compat
export type { Market as DbMarket, MarketOption };

/** Non-paginated query for Home sections (trending, featured, etc.) — legacy fallback */
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

/** Backend-scored home feeds */
export function useHomeFeeds() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['home-feeds'],
    queryFn: async () => {
      const feeds = await fetchHomeFeeds();
      // Populate individual market cache
      [...feeds.featured, ...feeds.trending, ...feeds.popular, ...feeds.ending_soon].forEach(m => {
        queryClient.setQueryData(['market', m.id], m);
      });
      return feeds;
    },
    staleTime: 30_000,
  });
}

/** Server-sorted browse with pagination */
export function useBrowseSorted(params: {
  sort?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const pageSize = params.limit || 20;
  const offset = (params.page || 0) * pageSize;

  return useQuery({
    queryKey: ['browse-sorted', params.sort, params.category, params.page],
    queryFn: () => fetchBrowseSorted({
      sort: params.sort,
      category: params.category,
      limit: pageSize,
      offset,
    }),
    staleTime: 30_000,
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

export function useLeaderboard(filters?: { period?: string; category?: string }) {
  return useQuery({
    queryKey: ['leaderboard', filters?.period ?? 'all', filters?.category ?? 'all'],
    queryFn: () => fetchLeaderboard(filters),
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
