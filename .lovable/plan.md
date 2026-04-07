

# Fix: Notifications Realtime, Profile Stats, OG Image

## Summary of Findings

### 1. Notifications Realtime — Already Working ✅
The `notifications` table is **already added** to `supabase_realtime` publication. The `useNotifications` hook already subscribes to `postgres_changes` filtered by `user_id`. No changes needed here.

### 2. Profile Statistics (`calculate_user_scores`) — Working ✅
The function logic is correct. No users currently have `total_predictions > 0`, so there's nothing to validate yet. The formula and profile page display are aligned. No changes needed.

### 3. OG Image Edge Function — Has a CORS Bug 🐛

The `og-image/index.ts` imports `corsHeaders` from `../_shared/cors.ts`, but that file exports `corsHeaders` as a **function** (takes an `origin` parameter), while `og-image` uses it as a plain **object** (spreading it directly). This means every response gets `[object Function]` instead of actual headers.

Additionally, the `escapeXml` function is not applied to option labels, which could break the SVG if a label contains `<`, `>`, or `&`.

The SVG renders correctly content-wise (tested with a real market and got a valid response with status 200), but the CORS headers are malformed.

## Plan

### Step 1 — Fix `og-image/index.ts` CORS usage
Call `corsHeaders(origin)` instead of spreading the raw import. Extract the `Origin` header from the request and pass it through.

```typescript
const origin = req.headers.get("origin");
const headers = corsHeaders(origin);
// Use `headers` in all Response constructors
```

### Step 2 — Escape option labels in SVG
Apply `escapeXml()` to `o.label` in the option bars to prevent SVG injection/breakage.

### Step 3 — Deploy and verify
Deploy the updated edge function and test with curl.

---

**No database changes needed. No profile/notification changes needed.**
Only one file changes: `supabase/functions/og-image/index.ts`.

