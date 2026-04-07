

# Dedicated Missions Page

## Overview
Create a full `/missions` page with current missions progress, completed missions history, and accumulated reward statistics. Accessible from the Header nav and Bottom Nav (for logged-in users).

## New File: `src/pages/Missions.tsx`

A protected page with three sections:

1. **Stats bar** — total credits earned from missions, total score earned, total missions completed (query `user_missions` where `claimed_at IS NOT NULL`)
2. **Active Missions** — reuse `MissionsCard` component (daily/weekly tabs) already built
3. **History** — table/list of past completed missions (`user_missions` joined with `missions`, where `claimed_at IS NOT NULL`, ordered by `claimed_at DESC`), showing mission title, period, reward earned, and date claimed

## New Hook: `useMissionHistory`

Query `user_missions` joined with `missions` for the current user where `claimed_at IS NOT NULL`, ordered by `claimed_at DESC`. Returns title, reward_credits, reward_score, period, claimed_at. Also computes aggregate stats (total credits, total score, count).

## Navigation Changes

### Header (`src/components/layout/Header.tsx`)
- Add "Missões" link to `NAV_ITEMS` array (between existing items, e.g. after "Ranking")

### BottomNav (`src/components/layout/BottomNav.tsx`)
- For logged-in users, replace "Criar" (center highlight button) with a `Target` icon "Missões" link pointing to `/missions`, keeping the highlight style. Or add "Missões" as one of the nav items.
- Better approach: keep the 5 items as-is on mobile. The page is accessible from the header on desktop and from a link inside the dashboard MissionsCard.

### MissionsCard (`src/components/futra/MissionsCard.tsx`)
- Add a "Ver todas" link in the header pointing to `/missions`

## Routing (`src/App.tsx`)
- Add lazy import for Missions page
- Add protected route: `/missions`

## Files Changed
1. **`src/pages/Missions.tsx`** — new page with stats + active missions + history
2. **`src/hooks/useMissions.ts`** — add `useMissionHistory` and `useMissionStats` hooks
3. **`src/components/futra/MissionsCard.tsx`** — add "Ver todas →" link
4. **`src/components/layout/Header.tsx`** — add "Missões" to nav items
5. **`src/App.tsx`** — add `/missions` route

