/**
 * Centralized React Query cache durations.
 * Use these constants instead of hardcoded staleTime/gcTime values
 * so behaviour stays consistent across the app.
 */

export const QUERY_STALE = {
  /** Highly volatile data (search results, live counts). */
  realtime: 10_000,
  /** Default for lists/feeds that change frequently. */
  short: 30_000,
  /** Stable lookups (profile, leaderboard, single market). */
  medium: 60_000,
  /** Reference data that rarely changes (achievements, categories). */
  long: 5 * 60_000,
  /** Static lookups (constants, enums). */
  static: 30 * 60_000,
} as const;

export const QUERY_GC = {
  short: 2 * 60_000,
  medium: 5 * 60_000,
  long: 15 * 60_000,
} as const;
