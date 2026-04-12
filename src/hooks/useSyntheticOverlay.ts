/**
 * Synthetic overlay hook — applies synthetic data on top of real market data.
 * Only active for admin users when synthetic mode is enabled per market.
 * Regular users never see synthetic data.
 */
import { useMemo } from 'react';
import { useAdmin } from './useAdmin';
import { useSyntheticMarkets } from './useSyntheticMarket';
import { generateSyntheticStats } from '@/lib/synthetic-engine';
import type { Market } from '@/types';

export type SyntheticViewMode = 'real' | 'synthetic' | 'both';

function getViewMode(): SyntheticViewMode {
  try {
    return (localStorage.getItem('futra-synthetic-view') as SyntheticViewMode) || 'synthetic';
  } catch {
    return 'synthetic';
  }
}

export function setViewMode(mode: SyntheticViewMode) {
  try {
    localStorage.setItem('futra-synthetic-view', mode);
  } catch {}
}

/**
 * Apply synthetic overlay to an array of markets.
 * Returns the markets with synthetic data applied where configured.
 */
export function useSyntheticOverlay(markets: Market[]): {
  markets: Market[];
  syntheticIds: Set<string>;
  viewMode: SyntheticViewMode;
  enabledCount: number;
} {
  const { isAdmin } = useAdmin();
  const { enabledMap, enabledCount } = useSyntheticMarkets();
  const viewMode = getViewMode();

  const result = useMemo(() => {
    if (!isAdmin || enabledMap.size === 0 || viewMode === 'real') {
      return { markets, syntheticIds: new Set<string>() };
    }

    const syntheticIds = new Set<string>();
    const overlayedMarkets = markets.map(market => {
      const synthRow = enabledMap.get(market.id);
      if (!synthRow) return market;

      syntheticIds.add(market.id);
      const stats = generateSyntheticStats(
        synthRow.seed,
        synthRow.config,
        market.options.map(o => ({ id: o.id, label: o.label })),
      );

      return {
        ...market,
        options: stats.options,
        total_participants: stats.totalParticipants,
        total_credits: stats.totalCredits,
        _chartPoints: stats.chartPoints,
      } as Market & { _chartPoints?: number[] };
    });

    return { markets: overlayedMarkets, syntheticIds };
  }, [markets, isAdmin, enabledMap, viewMode]);

  return {
    ...result,
    viewMode,
    enabledCount,
  };
}

/**
 * Apply synthetic overlay to a single market.
 */
export function useSingleSyntheticOverlay(market: Market | null | undefined): {
  market: (Market & { _chartPoints?: number[] }) | null | undefined;
  isSynthetic: boolean;
} {
  const { isAdmin } = useAdmin();
  const { enabledMap } = useSyntheticMarkets();
  const viewMode = getViewMode();

  return useMemo(() => {
    if (!market || !isAdmin || viewMode === 'real') {
      return { market, isSynthetic: false };
    }

    const synthRow = enabledMap.get(market.id);
    if (!synthRow) return { market, isSynthetic: false };

    const stats = generateSyntheticStats(
      synthRow.seed,
      synthRow.config,
      market.options.map(o => ({ id: o.id, label: o.label })),
    );

    return {
      market: {
        ...market,
        options: stats.options,
        total_participants: stats.totalParticipants,
        total_credits: stats.totalCredits,
        _chartPoints: stats.chartPoints,
      },
      isSynthetic: true,
    };
  }, [market, isAdmin, enabledMap, viewMode]);
}
