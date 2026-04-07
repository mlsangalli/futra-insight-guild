

# Missions System v1

## Overview

A daily/weekly missions system that rewards users for core behaviors (predictions, comments, watchlist, sharing) with credits and score. Backend-driven with automatic progress tracking and manual claim.

## Architecture

```text
┌──────────────────────────────────────────────┐
│ DB: missions (static definitions)            │
│   + user_missions (per-user per-period)      │
├──────────────────────────────────────────────┤
│ RPC: track_mission_progress(action, metadata)│
│   - called after each user action            │
│   - upserts user_missions row for today/week │
│   - increments current_value                 │
├──────────────────────────────────────────────┤
│ RPC: claim_mission_reward(user_mission_id)   │
│   - validates completed && not claimed       │
│   - awards credits + score                   │
│   - creates notification + credit_transaction│
├──────────────────────────────────────────────┤
│ Edge Function: reset-missions (cron daily)   │
│   - creates fresh user_missions rows daily   │
│   - weekly rows on Mondays                   │
│   - uses UTC dates, no timezone bugs         │
├──────────────────────────────────────────────┤
│ Hook: useMissions()                          │
│   - fetches user's active missions + progress│
│ Hook: useTrackMission()                      │
│   - fire-and-forget RPC call after actions   │
│ Hook: useClaimMission()                      │
│   - claim mutation with query invalidation   │
├──────────────────────────────────────────────┤
│ Component: MissionsCard (dashboard)          │
│   - compact card with progress bars          │
│   - daily/weekly tabs                        │
│   - claim button per completed mission       │
└──────────────────────────────────────────────┘
```

## Step 1 — Database Migration

### Table: `missions`
```sql
CREATE TABLE missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,        -- 'prediction','comment','watchlist','share','win','category_diversity','pre_lock'
  title text NOT NULL,
  description text NOT NULL,
  period text NOT NULL CHECK (period IN ('daily','weekly')),
  goal_value integer NOT NULL DEFAULT 1,
  reward_credits integer NOT NULL DEFAULT 0,
  reward_score integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
-- Public read
CREATE POLICY "Missions viewable by everyone" ON missions FOR SELECT TO public USING (true);
```

### Table: `user_missions`
```sql
CREATE TABLE user_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  period_start date NOT NULL,       -- e.g. 2026-04-07 for daily, Monday date for weekly
  current_value integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id, period_start)
);
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own missions" ON user_missions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System manages missions" ON user_missions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### RPC: `track_mission_progress`
A `SECURITY DEFINER` function that:
1. Takes `p_action_type text` and optional `p_metadata jsonb`
2. Gets today's date (UTC) and current week's Monday
3. For each active mission matching `action_type`:
   - Upserts `user_missions` row for the correct period_start
   - Increments `current_value` (capped at `goal_value`)
   - Sets `completed = true` and `completed_at` when goal reached
4. Returns void (fire-and-forget)

Special handling for `category_diversity`: metadata contains `{category: "..."}`, the function counts distinct categories from predictions this week instead of simple increment.

### RPC: `claim_mission_reward`
A `SECURITY DEFINER` function that:
1. Takes `p_user_mission_id uuid`
2. Validates: belongs to caller, completed = true, claimed_at IS NULL
3. Looks up mission reward amounts
4. Updates `profiles.futra_credits += reward_credits`
5. If `reward_score > 0`, updates `profiles.futra_score += reward_score`
6. Inserts `credit_transaction` (type: `mission_reward`)
7. Inserts notification
8. Sets `claimed_at = now()`
9. Returns reward info

### Seed: Initial missions (via insert tool, not migration)
| Period | Action Type | Title | Goal | Credits | Score |
|--------|------------|-------|------|---------|-------|
| daily | prediction | Fazer 1 previsão | 1 | 25 | 5 |
| daily | comment | Comentar em 1 mercado | 1 | 15 | 3 |
| daily | watchlist | Salvar 2 mercados | 2 | 10 | 2 |
| weekly | win | Acertar 3 previsões | 3 | 100 | 25 |
| weekly | category_diversity | Prever em 3 categorias | 3 | 75 | 15 |
| weekly | share | Compartilhar 1 mercado | 1 | 30 | 5 |
| weekly | pre_lock | 5 previsões antes do lock | 5 | 50 | 10 |

## Step 2 — Edge Function: `initialize-user-missions`

A cron-triggered function (runs daily at 00:05 UTC) that:
1. For all users with at least 1 prediction, creates `user_missions` rows for today's daily missions (if not exists)
2. On Mondays, also creates weekly mission rows
3. Uses `ON CONFLICT DO NOTHING` for idempotency

Alternative: missions rows are created lazily by `track_mission_progress` on first action. This avoids the cron entirely and is simpler. **I'll use the lazy approach** — `track_mission_progress` upserts rows as needed.

## Step 3 — Frontend Integration: Track Actions

Modify existing mutation hooks to call `track_mission_progress` after success:

- **`useCreatePrediction`** → `track('prediction', { category, market_id })`; also `track('pre_lock')` if market has lock_date and it's in the future
- **`useCreateComment`** → `track('comment')`
- **`useToggleWatchlist`** → `track('watchlist')` (only on add, not remove)
- **`ShareButton`** → `track('share')` on any share action

For `win` tracking: already handled in `resolve_market_and_score`. Add a call to `track_mission_progress` inside that RPC for each winner.

## Step 4 — Hook: `useMissions`

```typescript
// src/hooks/useMissions.ts
export function useMissions() { ... }      // fetches user_missions + missions for current day/week
export function useClaimMission() { ... }   // mutation to claim reward
export function useTrackMission() { ... }   // fire-and-forget tracking
```

`useMissions` query: joins `user_missions` with `missions` table, filtered to current day's daily + current week's weekly missions. Returns typed array with progress info.

## Step 5 — Component: `MissionsCard`

New file: `src/components/futra/MissionsCard.tsx`

A compact card with:
- "Missões" header with daily/weekly toggle
- Each mission row: icon + title + progress bar + reward badge + claim button
- Completed missions show checkmark, claimed ones are dimmed
- Uses existing `Progress` component
- Dark card styling consistent with `RecentResultsCard`

## Step 6 — Dashboard Integration

Add `<MissionsCard />` to Dashboard between `RecentResultsCard` and the tabs section. No other page changes needed for v1.

## Files Changed

1. **New migration** — `missions` + `user_missions` tables, `track_mission_progress` RPC, `claim_mission_reward` RPC
2. **Seed data** (insert tool) — 7 initial missions
3. **`src/hooks/useMissions.ts`** — new hook file
4. **`src/components/futra/MissionsCard.tsx`** — new component
5. **`src/hooks/usePrediction.ts`** — add tracking call in onSuccess
6. **`src/hooks/useComments.ts`** — add tracking call in onSuccess
7. **`src/hooks/useWatchlist.ts`** — add tracking call in onSuccess (add only)
8. **`src/components/futra/ShareButton.tsx`** — add tracking call on share
9. **`src/pages/Dashboard.tsx`** — add MissionsCard
10. **Update `resolve_market_and_score`** — add `track_mission_progress` call for winners

## Reset Logic

- **Daily**: `period_start = CURRENT_DATE` (UTC). Each new day, old daily missions are naturally inactive — new rows are created lazily on first action.
- **Weekly**: `period_start = date_trunc('week', CURRENT_DATE)::date` (Monday). Same lazy creation.
- No cron needed. Old rows remain as history.

## Claim Flow

1. User completes mission → row shows `completed = true`
2. User taps "Resgatar" → `claim_mission_reward` RPC
3. RPC atomically awards credits/score, creates transaction + notification
4. Frontend invalidates queries, shows toast
5. Double-claim prevented by `claimed_at IS NOT NULL` check

