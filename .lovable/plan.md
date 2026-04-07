

# Achievements/Badges System v1

## Overview

Permanent achievements that reinforce reputation, consistency, and expertise. Backend-driven unlock logic via a `SECURITY DEFINER` RPC, displayed on Profile and Dashboard with a dark, understated visual style.

## Architecture

```text
┌─────────────────────────────────────────────┐
│ DB: achievements (static definitions)       │
│   + user_achievements (unlocked per user)   │
├─────────────────────────────────────────────┤
│ RPC: check_achievements(p_user_id)          │
│   - evaluates all criteria against user data│
│   - inserts new unlocks + notifications     │
│   - called after key events (resolve, etc.) │
├─────────────────────────────────────────────┤
│ Hook: useAchievements(userId)               │
│   - fetches user's unlocked achievements    │
│ Hook: useAllAchievements()                  │
│   - fetches all active achievements         │
├─────────────────────────────────────────────┤
│ Components:                                 │
│   AchievementBadge — single badge w/tooltip │
│   AchievementsSection — profile section     │
│   RecentAchievements — dashboard card       │
└─────────────────────────────────────────────┘
```

## Step 1 — Database Migration

### Table: `achievements`
- `id uuid PK`, `key text UNIQUE`, `name text`, `description text`, `icon text` (lucide icon name), `category text` (milestone/accuracy/category/social/special), `rarity text` (common/rare/epic/legendary), `criteria_type text`, `criteria_value integer`, `active boolean DEFAULT true`, `created_at timestamptz`
- RLS: public SELECT, no insert/update/delete for users

### Table: `user_achievements`
- `id uuid PK`, `user_id uuid NOT NULL`, `achievement_id uuid REFERENCES achievements`, `unlocked_at timestamptz DEFAULT now()`
- UNIQUE (user_id, achievement_id)
- RLS: public SELECT (achievements are public on profiles), authenticated INSERT with `auth.uid() = user_id`

### RPC: `check_achievements(p_user_id uuid)`
A `SECURITY DEFINER` function that checks all active achievements against user data and unlocks any newly earned ones. Logic per `criteria_type`:

| criteria_type | Check |
|---|---|
| `first_prediction` | `total_predictions >= 1` |
| `wins_count` | count of `status='won'` predictions >= criteria_value |
| `resolved_count` | `resolved_predictions >= criteria_value` |
| `streak_days` | `streak >= criteria_value` |
| `category_expert` | count of `status='won'` in specific category >= criteria_value |
| `early_caller` | exists prediction won where selected option had <20% when predicted |
| `contrarian` | exists prediction won where selected option was not the majority |
| `referral_count` | count of referred users >= criteria_value |

For each newly unlocked achievement, inserts into `user_achievements` and creates a notification.

### Seed data (7 initial achievements via insert tool)

| Key | Name | Category | Rarity | Criteria |
|---|---|---|---|---|
| `first_prediction` | Primeiro Palpite | milestone | common | first_prediction, 1 |
| `five_wins` | Analista Certeiro | accuracy | rare | wins_count, 5 |
| `ten_resolved` | Veterano | milestone | common | resolved_count, 10 |
| `streak_7` | Sequência de Ferro | milestone | rare | streak_days, 7 |
| `expert_politics` | Estrategista Político | category | rare | category_expert, 5 (politics) |
| `expert_football` | Craque dos Palpites | category | rare | category_expert, 5 (football) |
| `expert_crypto` | Oráculo Cripto | category | rare | category_expert, 5 (crypto) |
| `early_caller` | Visionário | special | epic | early_caller, 1 |
| `contrarian` | Contra a Maré | special | epic | contrarian, 1 |
| `community_3` | Formador de Comunidade | social | rare | referral_count, 3 |

## Step 2 — Trigger Integration

Add `PERFORM check_achievements(rec.user_id)` calls inside `resolve_market_and_score` (after score calculation for each winner/loser). This ensures achievements are checked after every market resolution.

Also call from `calculate_user_scores` at the end, so streak-based achievements are caught.

## Step 3 — Frontend

### New hook: `src/hooks/useAchievements.ts`
- `useUserAchievements(userId)` — fetches `user_achievements` joined with `achievements` for a given user (public, works on any profile)
- `useAllAchievements()` — fetches all active achievements (for showing locked ones)

### New component: `src/components/futra/AchievementBadge.tsx`
- Small hexagonal or circular badge with lucide icon
- Rarity determines border glow: common (muted), rare (primary/blue), epic (emerald), legendary (gradient)
- Tooltip on hover showing name + description
- Locked state: grayscale, reduced opacity

### New component: `src/components/futra/AchievementsSection.tsx`
- Used on Profile page
- Grid of AchievementBadge components
- Shows unlocked first, then locked (dimmed) with "X/Y desbloqueados" counter
- Compact, 2-row grid on mobile

### Dashboard integration
- Add a small "Conquistas recentes" row below MissionsCard if user has any achievements
- Show last 3 unlocked badges with dates

### Profile page integration
- Add AchievementsSection between the stats grid and the predictions history
- Works for both own profile and viewing others' profiles

## Step 4 — Visual Identity

- Icons: lucide-react icons (Target, Award, Flame, Shield, TrendingDown, Users, Eye, Zap, Crown)
- Rarity colors via border/ring only, not background fills:
  - common: `border-border`
  - rare: `border-primary/40 ring-1 ring-primary/20`
  - epic: `border-emerald/40 ring-1 ring-emerald/20`
  - legendary: `border-amber-400/40 ring-1 ring-amber-400/20`
- Badge container: `bg-card` with subtle border, 40x40px icon area
- No animations, no confetti — just a toast notification on unlock

## Files Changed

1. **New migration** — `achievements` + `user_achievements` tables, `check_achievements` RPC, update `resolve_market_and_score` to call it
2. **Seed data** (insert tool) — 10 achievements
3. **`src/hooks/useAchievements.ts`** — new hooks
4. **`src/components/futra/AchievementBadge.tsx`** — new badge component with tooltip
5. **`src/components/futra/AchievementsSection.tsx`** — new profile section
6. **`src/pages/Profile.tsx`** — add AchievementsSection
7. **`src/pages/Dashboard.tsx`** — add recent achievements row

