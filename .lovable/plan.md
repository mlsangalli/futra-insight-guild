

# Automated Market Creation from Trends

## Overview

Create a Supabase Edge Function that fetches trending topics from Google Trends (via SerpApi) and Twitter/X Trends, generates prediction market questions using Lovable AI, and inserts them into the existing `markets` + `market_options` tables. A `scheduled_markets` table tracks what was already created to prevent duplicates. A pg_cron job triggers the function every 15 minutes.

## Architecture

```text
pg_cron (every 15 min)
  └─▶ Edge Function: create-markets-from-trends
        ├─ Fetch Google Trends (SerpApi)
        ├─ Fetch Twitter/X Trends (v2 API)
        ├─ Filter & deduplicate against scheduled_markets
        ├─ Call Lovable AI (Gemini) to generate market questions + options
        ├─ Insert into markets + market_options
        ├─ Insert into scheduled_markets
        └─ Log to admin_logs
```

## Prerequisites — API Keys

Two external API keys are required:

1. **SERPAPI_KEY** — for Google Trends data (serpapi.com, free tier: 100 searches/month)
2. **TWITTER_BEARER_TOKEN** — for X/Twitter trending topics (v2 API)

These will be added via the `add_secret` tool before implementation proceeds. The user must obtain these keys from the respective services.

## Step 1 — Database: `scheduled_markets` table

New migration creating:

```sql
CREATE TABLE public.scheduled_markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,              -- 'google_trends' | 'twitter'
  source_topic text NOT NULL,         -- raw trending topic string
  topic_hash text NOT NULL,           -- md5 hash for dedup
  market_id uuid REFERENCES markets(id),
  category market_category NOT NULL,
  status text NOT NULL DEFAULT 'created', -- created | skipped | failed
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(topic_hash)
);
ALTER TABLE public.scheduled_markets ENABLE ROW LEVEL SECURITY;

-- Only admins can view
CREATE POLICY "Admins view scheduled_markets" ON scheduled_markets
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));
```

The `topic_hash` with a UNIQUE constraint prevents duplicate markets from the same trending topic.

## Step 2 — Edge Function: `create-markets-from-trends`

New file: `supabase/functions/create-markets-from-trends/index.ts`

### Flow:

1. **Fetch trends** — parallel calls to SerpApi (Google Trends Brazil) and Twitter v2 trends (Brazil WOEID)
2. **Filter** — skip topics that are too short, contain profanity, or don't map to a FUTRA category
3. **Deduplicate** — compute MD5 of each topic, check against `scheduled_markets.topic_hash`
4. **Generate markets** — for each new topic (max 3 per run to avoid spam), call Lovable AI (Gemini 2.5 Flash) with a structured prompt:
   - Input: trending topic + category
   - Output: JSON with `question`, `options` (2-4 labels), `end_date` (relative), `resolution_source`
5. **Insert** — use service_role client to insert into `markets` (which triggers `populate_market_options_from_jsonb` automatically) and then into `scheduled_markets`
6. **Log** — insert admin_log entries with `action_type: 'auto_create_market'`

### Category mapping logic:

A keyword-based classifier maps trending topics to FUTRA categories:
- Football keywords → `football`
- Election/government keywords → `politics`
- Bitcoin/crypto keywords → `crypto`
- GDP/inflation keywords → `economy`
- Movie/music/TV keywords → `culture`
- AI/tech keywords → `technology`
- Fallback: skip topic (don't force a bad fit)

### AI prompt structure:

```
You are FUTRA's market generator. Given a trending topic in Brazil,
create a prediction market question in Portuguese (BR).

Rules:
- Question must be answerable with a definitive outcome
- 2-4 options (always include opposing outcomes)
- Set end_date 3-14 days from now based on topic urgency
- Include resolution_source (e.g. "Resultado oficial", "Placar final")
- Keep language analytical, not sensationalist

Topic: "{topic}"
Category: "{category}"

Respond as JSON: { question, options: string[], end_date_days: number, resolution_source }
```

### Safety guards:

- Max 3 markets created per execution (prevent flooding)
- Rate limit: function checks last run timestamp, skips if <10 min ago
- Service role key for all DB operations
- `created_by` set to `SYSTEM_USER_ID` (same pattern as close-locked-markets)

## Step 3 — Cron Job

Using pg_cron + pg_net (via insert tool, not migration):

```sql
SELECT cron.schedule(
  'create-markets-from-trends',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rnyqxlqovlnlcycetvrj.supabase.co/functions/v1/create-markets-from-trends',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body := '{"time":"' || now()::text || '"}'::jsonb
  ) AS request_id;
  $$
);
```

## Step 4 — Admin Visibility (optional enhancement)

Add a "Mercados Automáticos" section to `AdminMarkets.tsx` that queries `scheduled_markets` so admins can see what was auto-created, review, and disable if needed.

## Files Changed

1. **New migration** — `scheduled_markets` table with RLS
2. **`supabase/functions/create-markets-from-trends/index.ts`** — new Edge Function (trend fetching, AI generation, market insertion)
3. **Cron job SQL** (via insert tool) — pg_cron schedule every 15 min
4. **`src/pages/admin/AdminMarkets.tsx`** — optional: show auto-created markets log

## Secrets Required

Before implementation, two secrets must be added:
- `SERPAPI_KEY`
- `TWITTER_BEARER_TOKEN`

## Example: Generated Market Insert

```sql
-- What the edge function does internally:
INSERT INTO markets (question, category, type, options, end_date, status, resolution_source, created_by)
VALUES (
  'Flamengo vence o clássico contra o Fluminense no Maracanã?',
  'football',
  'binary',
  '[{"label":"Sim, Flamengo vence"},{"label":"Não, empate ou derrota"}]'::jsonb,
  now() + interval '5 days',
  'open',
  'Placar final do jogo',
  '00000000-0000-0000-0000-000000000001'
);
-- This triggers populate_market_options_from_jsonb automatically
```

