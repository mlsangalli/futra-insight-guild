

# Image Optimization — WebP & Lazy Loading

## Current State

This project uses almost **no raster images** in its UI. Avatars render initials (letter circles), charts are SVGs, icons are Lucide components. The only actual images are:

- `public/icon-192.png` and `public/icon-512.png` (PWA icons)
- `public/og-default.svg` (OG image fallback)
- `public/placeholder.svg`
- External avatar URLs entered by users in their profile

There are no `<img>` tags anywhere in the React components. The only place user-provided images appear is through the Radix `AvatarImage` component (which doesn't currently use `loading="lazy"`).

## What Actually Needs to Be Done

### Step 1 — Convert PWA icons to WebP

Convert `icon-192.png` and `icon-512.png` to WebP format (significantly smaller file size), update `manifest.json` to reference the new files with correct MIME types.

### Step 2 — Add `loading="lazy"` to AvatarImage

The Radix `AvatarImage` renders an `<img>` under the hood. Pass `loading="lazy"` to `AvatarImage` usage sites (Profile page, LeaderboardRow, ProfileCard) so external avatar URLs don't block initial paint. Currently these components render letter initials — but once users upload real avatar URLs, lazy loading will matter.

### Step 3 — Create a reusable `OptimizedImage` component

A thin wrapper around `<img>` that:
- Sets `loading="lazy"` and `decoding="async"` by default
- Accepts WebP source with fallback via `<picture>` element
- Applies consistent sizing classes

This ensures any future image additions follow best practices automatically.

### Step 4 — Fix `og-default` reference

`SEO.tsx` references `og-default.png` but the actual file is `og-default.svg`. Fix the reference.

## Files Changed

1. **`public/manifest.json`** — update icon entries to WebP format
2. **`src/components/ui/avatar.tsx`** — add `loading="lazy"` default prop to AvatarImage
3. **`src/components/futra/OptimizedImage.tsx`** — new reusable component
4. **`src/components/SEO.tsx`** — fix `og-default.png` → `og-default.svg`
5. **PWA icons** — convert PNG to WebP via script

## Impact

- Smaller PWA icon payloads (~30-50% reduction)
- Lazy-loaded avatars prevent unnecessary network requests
- Reusable pattern for any future image additions
- Correct OG image reference in meta tags

