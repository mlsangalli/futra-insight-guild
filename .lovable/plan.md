

# Plan: 10 Critical Improvements for FUTRA

## Summary
Implement 10 improvements covering security, market resolution, access control, PT-BR localization, prediction privacy, hero visual polish, social sharing, unit tests, branding consistency, and pagination.

---

## Improvement 1 — Security: Add .env to .gitignore

**Files changed:** `.gitignore`, `.env.example`

- Add `.env` and `.env.local` after `*.local` line in `.gitignore`
- Update `.env.example` to use Portuguese placeholders:
  ```
  VITE_SUPABASE_PROJECT_ID="seu-project-id"
  VITE_SUPABASE_PUBLISHABLE_KEY="sua-anon-key"
  VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
  ```
- Note: Cannot run `git rm --cached` (git state is managed internally), but `.gitignore` addition prevents future tracking

---

## Improvement 2 — Market Resolution System

**Database migration:**
- The `recalculate_global_ranks()` function already exists in the database (confirmed in schema). No migration needed for this.
- The `notifications` table already exists with correct schema. No migration needed.

**Files changed:** `supabase/functions/admin-actions/index.ts`, `src/hooks/useNotifications.ts`

- In `admin-actions/index.ts` `resolve_market` case: add notification insertion after winners/losers loop (batch insert for all participants)
- `useNotifications.ts` already fetches from the real `notifications` table correctly — no changes needed (verified in code review)

---

## Improvement 3 — Restrict Market Creation to Admins/Moderators

**Database migration:**
```sql
DROP POLICY IF EXISTS "Authenticated users can create markets" ON public.markets;
CREATE POLICY "Only admins can create markets" ON public.markets
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );
```
Note: Using only `admin` since `moderator` is not in the `app_role` enum.

**Files changed:** `src/pages/CreateMarket.tsx`
- Import `useAdmin` hook
- Check `isAdmin` — if false, show gated message: "Apenas moderadores podem criar mercados. Em breve você poderá sugerir mercados." with back button to `/browse`
- Replace existing `hasAccess` state with admin check

---

## Improvement 4 — Translate Entire UI to Portuguese (PT-BR)

This is the largest task. **~25 files** need text changes. Key translations:

**`src/types/index.ts`** — CATEGORIES labels and INFLUENCE_LABELS:
- Politics→Política, Economy→Economia, Crypto→Cripto, Football→Futebol, Culture→Cultura, Technology→Tecnologia
- Low Influence→Baixa Influência, Medium→Média, High→Alta, Elite stays Elite

**Pages (all user-facing text):**
- `Index.tsx` — hero, sections, CTAs, how-it-works, brand block
- `Browse.tsx` — title, sort labels, empty states
- `Leaderboard.tsx` — title, filters, empty state
- `Login.tsx` — labels, errors, buttons
- `Signup.tsx` — labels, errors, buttons
- `ForgotPassword.tsx` — all copy
- `ResetPassword.tsx` — all copy
- `VerifyEmail.tsx` — all copy
- `Onboarding.tsx` — steps, buttons
- `Dashboard.tsx` — tabs, labels, empty states
- `Profile.tsx` — labels, stats, sections
- `MarketDetail.tsx` — section headers, voting panel, buttons
- `HowItWorks.tsx` — all content
- `CreateMarket.tsx` — form labels, gated message
- `Watchlist.tsx` — title, empty state
- `SearchResults.tsx` — title, empty state
- `Notifications.tsx` — title, mark all read
- `NotFound.tsx` — 404 message
- `Category.tsx` — subtitle

**Components:**
- `Header.tsx` — nav items, search placeholder, auth buttons
- `Footer.tsx` — section titles, tagline
- `BottomNav.tsx` — labels (Início, Explorar, Criar, Ranking, Perfil/Login, Alertas)
- `ShareButton.tsx` — menu items
- `DailyBonusBanner.tsx` — bonus text
- `CommentSection.tsx` — placeholder, empty state
- `ReferralCard.tsx` — all copy
- `WatchlistButton.tsx` — label text
- `ErrorBoundary.tsx` — error message
- `EditProfileDialog.tsx` — labels
- `Skeletons.tsx` — ErrorState and EmptyState default text
- `SEO.tsx` — default description

**Hooks/Context (toast messages):**
- `AuthContext.tsx` — toast messages
- `usePrediction.ts` — success/error toasts

**No changes to:** variable names, function names, SQL table/column names, enum values in DB

---

## Improvement 5 — Predictions Privacy (RLS)

**Database migration:**
```sql
DROP POLICY IF EXISTS "Anyone can view predictions on resolved markets" ON public.predictions;
DROP POLICY IF EXISTS "Users can view own predictions" ON public.predictions;
DROP POLICY IF EXISTS "Admins can view all predictions" ON public.predictions;

CREATE POLICY "Users view own predictions" ON public.predictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Public view on non-open markets" ON public.predictions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.markets
      WHERE markets.id = predictions.market_id
      AND markets.status != 'open'
    )
  );

CREATE POLICY "Admins view all predictions" ON public.predictions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
```

No frontend changes needed — the existing queries will naturally respect these policies.

---

## Improvement 6 — Hero Section Visual Enhancement

**Files changed:** `src/pages/Index.tsx`

- When no featured market exists, show static hero with "Torne a incerteza legível" (large display text) + CTA "Explorar mercados"
- Add `🔴 AO VIVO` badge on hero card when market status is 'open'
- Add VoteBar component to hero card showing all options (not just leader percentage)
- In "Encerrando em breve" section: add urgency styling (red text) when `end_date` < 24h from now

---

## Improvement 7 — Social Share OG Images

**Files changed:** `src/pages/MarketDetail.tsx`, `src/components/SEO.tsx`, `src/components/futra/ShareButton.tsx`

- In `MarketDetail.tsx`: pass dynamic OG image URL to SEO component using the existing `og-image` edge function URL
- Update SEO description to include percentage data in PT-BR
- In `ShareButton.tsx`: add WhatsApp and Telegram share options, update share text to PT-BR format with percentage data

---

## Improvement 8 — Unit Tests

**Files created/changed:**
- `src/hooks/__tests__/usePrediction.test.ts` — test validation logic
- `src/components/__tests__/MarketCard.test.tsx` — test rendering with full and minimal data
- `src/components/__tests__/VoteBar.test.tsx` — test percentage sum to 100%

Tests use vitest + @testing-library/react with supabase client mocked.

---

## Improvement 9 — Branding: Force Dark Mode

**Files changed:** `src/index.css`

- Verify `html` has `class="dark"` forced (check if `next-themes` is used; if so, remove ThemeProvider or force dark)
- Ensure body background is the correct FUTRA dark tone
- Verify tailwind.config.ts has neon-blue, emerald, surface-800/900 colors

This is mostly verification — the existing dark theme is already in place. Minimal changes expected.

---

## Improvement 10 — Pagination with Infinite Query

**Files changed:** `src/lib/market-queries.ts`, `src/hooks/useMarkets.ts`, `src/pages/Browse.tsx`, `src/pages/Category.tsx`, `src/pages/Index.tsx`

- Add `page` and `pageSize` params to `fetchMarkets()` with `.range()` call
- Convert `useMarkets` to `useInfiniteQuery` with `getNextPageParam`
- Update `Browse.tsx` and `Category.tsx` to use `.data?.pages.flat()` and add "Carregar mais" button
- Keep `Index.tsx` using a simple query (create `useHomeMarkets` that fetches first 30 without pagination) to avoid breaking the hero/trending/popular sections

---

## Implementation Order
1 → 5 → 3 → 2 → 6 → 7 → 9 → 10 → 4 → 8

Security and DB migrations first, then UI enhancements, localization last (touches most files), tests at the end.

## Estimated File Changes
- ~30 files modified
- ~3 files created (tests)
- 2-3 database migrations

