/**
 * Deterministic synthetic data engine for FUTRA markets.
 * Uses Mulberry32 PRNG for reproducible results from a given seed.
 * All generation is client-side — no real data is ever modified.
 */

export interface SyntheticConfig {
  initial_probability: number;  // 0-100
  volatility: number;           // 0-1 (0.1 = stable, 0.8 = very volatile)
  volume_base: number;          // base number of participants
  growth_rate: number;          // multiplier for volume growth over time
  priority_level: number;       // 1-5, higher = more engagement
  mode: 'static' | 'dynamic';
}

export interface SyntheticMarketStats {
  options: { id: string; label: string; percentage: number; votes: number; creditsAllocated: number }[];
  totalParticipants: number;
  totalCredits: number;
  chartPoints: number[];
}

export const DEFAULT_CONFIG: SyntheticConfig = {
  initial_probability: 50,
  volatility: 0.3,
  volume_base: 100,
  growth_rate: 1.0,
  priority_level: 1,
  mode: 'static',
};

// ── Mulberry32 PRNG ─────────────────────────────────────────────

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Brownian motion with drift + mean reversion ─────────────────

function generateBrownianPath(
  rng: () => number,
  startValue: number,
  points: number,
  volatility: number,
  meanTarget: number,
): number[] {
  const path: number[] = [startValue];
  const meanReversionStrength = 0.05;
  const maxStep = volatility * 8; // cap single step size

  for (let i = 1; i < points; i++) {
    const prev = path[i - 1];
    // Gaussian-ish noise from uniform via Box-Muller approximation
    const u1 = Math.max(0.0001, rng());
    const u2 = rng();
    const noise = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    const drift = (meanTarget - prev) * meanReversionStrength;
    const step = Math.max(-maxStep, Math.min(maxStep, noise * volatility * 3 + drift));
    const next = Math.max(1, Math.min(99, prev + step));
    path.push(Math.round(next * 10) / 10);
  }
  return path;
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Generate a full set of synthetic stats for a market.
 * @param seed - Deterministic seed
 * @param config - Market simulation config
 * @param existingOptions - The real market options (we overlay percentages/votes)
 * @param chartPointsCount - Number of historical chart points to generate
 */
export function generateSyntheticStats(
  seed: number,
  config: SyntheticConfig,
  existingOptions: { id: string; label: string }[],
  chartPointsCount = 30,
): SyntheticMarketStats {
  const rng = mulberry32(seed);

  // Dynamic mode: add time-based offset (5-minute buckets)
  let effectiveRng = rng;
  if (config.mode === 'dynamic') {
    const timeBucket = Math.floor(Date.now() / (5 * 60 * 1000));
    const dynamicSeed = seed + timeBucket;
    effectiveRng = mulberry32(dynamicSeed);
  }

  const numOptions = existingOptions.length;
  const isBinary = numOptions === 2;

  // Generate primary probability
  const primaryProb = config.initial_probability;

  // Generate chart history (Brownian path for the primary option)
  const chartPoints = generateBrownianPath(
    effectiveRng,
    primaryProb,
    chartPointsCount,
    config.volatility * 5,
    primaryProb,
  );

  // Current probability is the last chart point
  const currentPrimary = chartPoints[chartPoints.length - 1];

  // Distribute percentages across options
  let percentages: number[];
  if (isBinary) {
    percentages = [currentPrimary, 100 - currentPrimary];
  } else {
    // For multiple options, generate proportional splits
    const rawWeights = existingOptions.map((_, i) => {
      if (i === 0) return currentPrimary;
      return Math.max(1, (100 - currentPrimary) * (effectiveRng() * 0.6 + 0.2));
    });
    const sum = rawWeights.reduce((a, b) => a + b, 0);
    percentages = rawWeights.map(w => Math.round((w / sum) * 1000) / 10);
    // Fix rounding to 100
    const diff = 100 - percentages.reduce((a, b) => a + b, 0);
    percentages[0] = Math.round((percentages[0] + diff) * 10) / 10;
  }

  // Generate volume based on priority and config
  const priorityMultiplier = 1 + (config.priority_level - 1) * 0.8;
  const baseParticipants = Math.round(config.volume_base * config.growth_rate * priorityMultiplier);
  const totalParticipants = Math.max(
    5,
    baseParticipants + Math.round(effectiveRng() * baseParticipants * 0.3),
  );

  const avgCreditsPerUser = 20 + Math.round(effectiveRng() * 60 * priorityMultiplier);
  const totalCredits = totalParticipants * avgCreditsPerUser;

  // Distribute votes and credits across options proportionally
  const options = existingOptions.map((opt, i) => {
    const pct = percentages[i];
    const fraction = pct / 100;
    const votes = Math.max(0, Math.round(totalParticipants * fraction + (effectiveRng() - 0.5) * 3));
    const credits = Math.max(0, Math.round(totalCredits * fraction));
    return {
      id: opt.id,
      label: opt.label,
      percentage: pct,
      votes,
      creditsAllocated: credits,
    };
  });

  return {
    options,
    totalParticipants,
    totalCredits,
    chartPoints,
  };
}

/**
 * Pre-defined config presets for quick setup
 */
export const CONFIG_PRESETS: Record<string, Partial<SyntheticConfig>> = {
  stable: { volatility: 0.1, volume_base: 80, growth_rate: 0.8, priority_level: 1 },
  moderate: { volatility: 0.3, volume_base: 150, growth_rate: 1.0, priority_level: 2 },
  volatile: { volatility: 0.7, volume_base: 200, growth_rate: 1.2, priority_level: 3 },
  hot: { volatility: 0.5, volume_base: 500, growth_rate: 1.5, priority_level: 5 },
  low_volume: { volatility: 0.2, volume_base: 20, growth_rate: 0.5, priority_level: 1 },
};
