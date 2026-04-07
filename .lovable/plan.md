

# Implement Real Leaderboard Filters

## Overview
Wire the existing time/category filter UI in the Leaderboard page to a new Supabase RPC function that computes rankings dynamically based on period and category.

## Step 1 — Database Migration: Create `get_leaderboard` RPC

Create a SQL function `public.get_leaderboard(p_period text DEFAULT 'all', p_category public.market_category DEFAULT null)` that:

- **`all` period, no category**: Returns from `profiles` ordered by `futra_score DESC` (current behavior, unchanged).
- **`week`/`month` period and/or category filter**: Aggregates from `predictions` joined with `markets`, computing wins/resolved/accuracy within the filtered scope, then scores using the same `ln()` formula. Returns the same column shape.

Return type: `TABLE(id uuid, user_id uuid, username text, display_name text, avatar_url text, influence_level influence_level, futra_score integer, accuracy_rate numeric, resolved_predictions bigint, total_predictions bigint)`

The function uses `SECURITY DEFINER` with `search_path = public` and is callable by `anon`/`authenticated`.

## Step 2 — Update `fetchLeaderboard` in `src/lib/market-queries.ts`

Change from a direct `profiles` select to `supabase.rpc('get_leaderboard', { p_period, p_category })`. Accept `period` and `category` parameters. When category is `'all'`, pass `null`.

## Step 3 — Update `useLeaderboard` in `src/hooks/useMarkets.ts`

Accept `{ period?: string; category?: string }` filters. Include them in the `queryKey` so TanStack Query caches per filter combination. Pass them through to `fetchLeaderboard`.

## Step 4 — Update `src/pages/Leaderboard.tsx`

- Map time filter labels to API values: `'Todos' → 'all'`, `'Esta semana' → 'week'`, `'Este mês' → 'month'`.
- Pass `{ period, category }` to `useLeaderboard(...)`.
- No layout/styling changes — same top-3 cards + remaining rows + empty/error/loading states.

## Files Changed

1. **New migration** — `get_leaderboard` RPC function
2. **`src/lib/market-queries.ts`** — update `fetchLeaderboard` signature + implementation
3. **`src/hooks/useMarkets.ts`** — update `useLeaderboard` to accept filters
4. **`src/pages/Leaderboard.tsx`** — wire filter state to hook params

## Technical Detail: SQL Function Logic

```sql
-- When p_period = 'all' AND p_category IS NULL → fast path from profiles
-- Otherwise → aggregate from predictions + markets with date/category filters
-- Date filter: week = now() - interval '7 days', month = now() - interval '30 days'
-- Score formula: ROUND((accuracy / 100.0) * ln(resolved + 1) * 100)
```

