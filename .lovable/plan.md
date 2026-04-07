

# Progression Layer — Level Bar, Score Delta & Result Recap

## Progression Model

The influence thresholds already exist in the DB (`calculate_user_scores`):

| Level | Min Score | Max Score |
|-------|----------|----------|
| low | 0 | 499 |
| medium | 500 | 1999 |
| high | 2000 | 4999 |
| elite | 5000 | ∞ |

These thresholds will be formalized as a shared constant and used for the progress bar calculation.

## What Goes Where

```text
┌─────────────────────────────────────────────┐
│ DASHBOARD                                   │
│  ┌─────────────────────────────────────────┐│
│  │ LevelProgressBar (below stat cards)     ││
│  │ [low ████████░░░░ medium] 320/500       ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │ RecentResultsCard (above credit txns)   ││
│  │ ✅ "Quem vence o campeonato?" +120FC +18││
│  │ ❌ "Bitcoin acima de 100k?" -50FC  -3   ││
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│ PROFILE                                     │
│  LevelProgressBar (below stat cards grid)   │
├─────────────────────────────────────────────┤
│ RESOLVED PREDICTIONS (Dashboard tab)        │
│  Each row shows: +reward FC, +/-score delta │
└─────────────────────────────────────────────┘
```

## Implementation Plan

### Step 1 — DB Migration: Add `score_delta` to `predictions`

Add a nullable integer column `score_delta` to `predictions`. Update `resolve_market_and_score` to compute and store the score change per user (score after − score before) when resolving.

```sql
ALTER TABLE predictions ADD COLUMN score_delta integer DEFAULT NULL;
```

Then update `resolve_market_and_score` to capture `old_score` before calling `calculate_user_scores`, then set `score_delta = new_score - old_score` on the prediction row.

### Step 2 — Shared constants: `INFLUENCE_THRESHOLDS`

Add to `src/types/index.ts`:

```typescript
export const INFLUENCE_THRESHOLDS: Record<InfluenceLevel, { min: number; max: number | null }> = {
  low: { min: 0, max: 499 },
  medium: { min: 500, max: 1999 },
  high: { min: 2000, max: 4999 },
  elite: { min: 5000, max: null },
};
```

### Step 3 — Component: `LevelProgressBar`

New file: `src/components/futra/LevelProgressBar.tsx`

A reusable component accepting `score` and `influenceLevel`. Displays:
- Current level badge (reuses `InfluenceBadge`)
- Progress bar from current threshold min to next threshold min
- "320 / 500 para Média Influência" text
- Elite shows a full bar with a "Max level" label

Uses the existing `Progress` component from `src/components/ui/progress.tsx` and the dark card styling.

### Step 4 — Component: `RecentResultsCard`

New file: `src/components/futra/RecentResultsCard.tsx`

Fetches the last 5 resolved predictions (won/lost) with market question, reward, and score_delta. Shows a compact card with:
- Market question (truncated)
- ✅/❌ status icon
- "+120 FC" / "-50 FC" credit change
- "+18 score" / "-3 score" delta (if available)

Uses `usePublicPredictions` or a similar query scoped to the current user.

### Step 5 — Update Dashboard

In `src/pages/Dashboard.tsx`:
- Add `LevelProgressBar` after the stat cards grid
- Add `RecentResultsCard` before the credit transactions section
- In the "Resolvidas" tab, show `score_delta` inline on each resolved prediction row (when available)

### Step 6 — Update Profile

In `src/pages/Profile.tsx`:
- Add `LevelProgressBar` after the stat cards grid
- In the prediction history section, show `score_delta` on each row (when available)

### Step 7 — Update `resolve_market_and_score` (Migration)

Modify the function to:
1. Before calling `calculate_user_scores(rec.user_id)`, read `old_score` from `profiles`
2. After calling it, read `new_score` from `profiles`
3. `UPDATE predictions SET score_delta = new_score - old_score WHERE id = rec.id`

This is a single migration that replaces the function.

## Files Changed

1. **New migration** — add `score_delta` column + update `resolve_market_and_score`
2. **`src/types/index.ts`** — add `INFLUENCE_THRESHOLDS` constant
3. **`src/components/futra/LevelProgressBar.tsx`** — new component
4. **`src/components/futra/RecentResultsCard.tsx`** — new component
5. **`src/pages/Dashboard.tsx`** — integrate both components + show delta in resolved tab
6. **`src/pages/Profile.tsx`** — integrate `LevelProgressBar` + show delta in history

## No changes to

- Prediction mechanics, credit logic, or market resolution outcomes
- App.tsx, routes, header, bottom nav
- Leaderboard page
- Any existing component styling

