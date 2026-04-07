

# Social Share Cards System

## Architecture Decision

Extend the existing `og-image` edge function into a unified `share-card` edge function that generates SVG cards for all three types (market, win, profile). SVGs are lightweight, render perfectly at any size, and avoid heavy image generation dependencies. The existing og-image already uses this pattern successfully.

The edge function serves as both OG image source (for social previews) and direct share asset. On the frontend, the ShareButton is enhanced to generate better copy per context, and new share actions are added to the Profile page and resolved market results.

## Step 1 — Edge Function: `share-card`

Replace/extend `supabase/functions/og-image/index.ts` to handle three card types via `?type=market|win|profile`:

### A) Market Odds Card (`?type=market&id=XXX`)
- Dark background (#060B18)
- FUTRA logo text top-left, category badge top-right
- Market question (large, bold)
- Leader option with large percentage + neon glow
- All options as horizontal bars with percentages
- Participant count + credit pool footer
- "futra.app" watermark

### B) Win/Result Card (`?type=win&prediction_id=XXX`)
- Queries prediction + market + user profile
- Shows market question, user's choice, correct answer
- Green checkmark or red X seal
- Credits won/lost, score delta
- User display name + accuracy rate
- Requires service role (accesses prediction data)

### C) Profile Card (`?type=profile&username=XXX`)
- User avatar initial + display name + @username
- Global rank, score, accuracy rate, streak
- Influence level badge
- Achievement count
- Clean dark layout with subtle borders

### Visual tokens (shared across all cards):
- Background: `#060B18`
- Primary accent: `#6366f1` (indigo/primary)
- Green: `#22c55e`
- Text: white + `#71717a` for muted
- Font: system-ui
- Size: 1200x630 (OG standard)

## Step 2 — Frontend: Enhanced ShareButton

Update `ShareButton` to accept an optional `ogImageUrl` prop and `variant` to customize share copy per context. No breaking changes — existing usage keeps working.

Add a new `ShareCardButton` wrapper used in specific contexts:

### Market Detail page
- Already has ShareButton — update share text to include the leader percentage
- OG URL already points to og-image function

### Resolved market / Result card
- Add share button to the `VotingPanelContent` resolved state
- Share text: `"Acertei! {question} → {result}. +{reward} FC na FUTRA"` or `"Errei {question}. Resultado: {result}"`
- OG URL: `share-card?type=win&prediction_id=XXX`

### Profile page
- Already has `handleShareProfile` — enhance to use structured share text
- OG URL: `share-card?type=profile&username=XXX`
- Add share to X/Twitter/Telegram options (currently only copies link)

## Step 3 — SEO Meta Tags

Update the `SEO` component usage in:
- `MarketDetail.tsx` — already done, keep pointing to share-card?type=market
- `Profile.tsx` — add `ogImage` pointing to `share-card?type=profile&username=XXX`

## Step 4 — RecentResultsCard share action

Add a small share icon per result row in `RecentResultsCard` so users can quickly share wins from the dashboard.

## Files Changed

1. **`supabase/functions/og-image/index.ts`** — rewrite to support 3 card types (market, win, profile) with shared SVG rendering utilities
2. **`src/components/futra/ShareButton.tsx`** — add optional `ogImageUrl` prop, enhance share text formatting
3. **`src/pages/MarketDetail.tsx`** — add share button in resolved panel with win/loss card URL
4. **`src/pages/Profile.tsx`** — enhance share to use profile card OG image, add X/Telegram/WhatsApp share options
5. **`src/components/futra/RecentResultsCard.tsx`** — add per-row share icon for wins
6. **`src/pages/MarketDetail.tsx` (SEO)** — update ogImage URL to use new endpoint format

