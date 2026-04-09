ALTER TABLE public.scheduled_markets
  ADD COLUMN IF NOT EXISTS priority_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_notes text DEFAULT '';