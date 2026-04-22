import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const sampleMarket = {
  id: 'test-1',
  question: 'Will BTC hit 100k?',
  description: 'Test market',
  category: 'crypto',
  type: 'binary',
  status: 'open',
  options: [
    { id: 'opt-1', label: 'Yes', votes: 10, creditsAllocated: 500, percentage: 70 },
    { id: 'opt-2', label: 'No', votes: 4, creditsAllocated: 200, percentage: 30 },
  ],
  total_participants: 14,
  total_credits: 700,
  end_date: '2026-12-31T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  resolution_source: null,
  resolution_rules: null,
  featured: true,
  trending: false,
  created_by: null,
  lock_date: null,
  resolved_option: null,
};

vi.mock('@/lib/market-queries', () => ({
  fetchAllMarkets: vi.fn().mockResolvedValue([sampleMarket]),
  fetchMarkets: vi.fn().mockResolvedValue({ data: [sampleMarket], nextCursor: null }),
  fetchMarketById: vi.fn().mockResolvedValue(sampleMarket),
  fetchHomeFeeds: vi.fn().mockResolvedValue({ featured: [], trending: [], popular: [], ending_soon: [] }),
  fetchBrowseSorted: vi.fn().mockResolvedValue({ data: [], totalCount: 0 }),
  fetchLeaderboard: vi.fn().mockResolvedValue([]),
  fetchProfile: vi.fn().mockResolvedValue(null),
  fetchUserPredictions: vi.fn().mockResolvedValue([]),
}));

// Stub synthetic overlay to be a passthrough so useMarkets tests stay focused.
vi.mock('@/hooks/useSyntheticOverlay', () => ({
  useSyntheticOverlay: (markets: unknown[]) => ({
    markets,
    syntheticIds: new Set(),
    viewMode: 'real',
    enabledCount: 0,
  }),
  useSingleSyntheticOverlay: (market: unknown) => ({ market, isSynthetic: false }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useMarkets', () => {
  it('fetches and returns markets list', async () => {
    const { useMarkets } = await import('@/hooks/useMarkets');
    const { result } = renderHook(() => useMarkets(), { wrapper: createWrapper() });

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].question).toBe('Will BTC hit 100k?');
  });

  it('returns market_options with correct shape', async () => {
    const { useMarkets } = await import('@/hooks/useMarkets');
    const { result } = renderHook(() => useMarkets(), { wrapper: createWrapper() });

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));
    const options = result.current.data![0].options;
    expect(options[0]).toHaveProperty('id');
    expect(options[0]).toHaveProperty('label');
    expect(options[0]).toHaveProperty('votes');
    expect(options[0]).toHaveProperty('creditsAllocated');
    expect(options[0]).toHaveProperty('percentage');
  });

  it('fetches single market by id', async () => {
    const { useMarket } = await import('@/hooks/useMarkets');
    const { result } = renderHook(() => useMarket('test-1'), { wrapper: createWrapper() });

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.question).toBe('Will BTC hit 100k?');
  });
});
