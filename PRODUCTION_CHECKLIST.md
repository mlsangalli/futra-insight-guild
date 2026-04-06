# FUTRA Production Readiness Checklist

## Security
- [ ] .env removed from git history (use BFG Repo-Cleaner)
- [ ] Supabase keys rotated after exposure
- [ ] All RLS policies tested and active
- [ ] Admin routes protected by AdminRoute
- [ ] Edge Functions validate Authorization headers
- [ ] CORS configured for production domain only

## Performance
- [ ] Vite build passes without errors
- [ ] Bundle size < 200KB gzipped (main chunk)
- [ ] All pages lazy loaded
- [ ] Images optimized (WebP, lazy loading)
- [ ] Supabase indexes for common queries

## Functionality
- [ ] Sign up → Onboarding → Dashboard flow works
- [ ] Prediction flow: browse → vote → confirm → see result
- [ ] Market resolution → score calculation → credit distribution
- [ ] Daily bonus claim works
- [ ] Search returns relevant results
- [ ] Notifications arrive in real-time
- [ ] Social share cards render correctly (test with Twitter Card Validator)
- [ ] Profile shows accurate stats

## SEO & Social
- [ ] Every page has unique title and meta description
- [ ] OG images generate correctly per market
- [ ] Manifest.json valid for PWA
- [ ] Favicon and icons present in all sizes

## Monitoring
- [ ] Error tracking configured (Sentry or similar)
- [ ] Admin dashboard shows real-time metrics
- [ ] Health check endpoint functional
