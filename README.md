# FUTRA — Plataforma de Previsões Sociais

Social prediction markets platform where your forecasts build reputation, status, and influence. No real money — just conviction.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Shadcn/Radix
- **Backend:** Lovable Cloud (Supabase) — Auth, Database, Edge Functions, Realtime
- **State:** TanStack React Query + React Context
- **Routing:** React Router v6

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd futra-insight-guild
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Fill in the values in `.env` with your project credentials.

4. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── futra/        # Domain-specific components (MarketCard, VoteBar, etc.)
│   ├── layout/       # Layout components (Header, Footer, BottomNav)
│   ├── admin/        # Admin panel components
│   └── ui/           # Shadcn/Radix primitives
├── contexts/         # React Context providers (Auth)
├── hooks/            # Custom hooks (useMarkets, useAdmin, useRealtime)
├── pages/            # Route page components
│   └── admin/        # Admin pages
├── data/             # Types and mock data
└── integrations/     # Supabase client and types
supabase/
├── functions/        # Edge Functions (admin-actions, close-locked-markets)
└── config.toml       # Supabase project config
```

## Features

- **Prediction Markets** — Browse, vote, and track markets across 6 categories
- **Reputation System** — Futra Score, accuracy rate, streaks, influence levels
- **Real-time Odds** — Live updates via Supabase Realtime
- **Admin Panel** — Market management, resolution, user roles, content CMS
- **Onboarding Flow** — Guided setup for new users with category selection
- **SEO** — Dynamic meta tags per page via react-helmet-async
