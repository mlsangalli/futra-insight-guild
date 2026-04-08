
-- Expand scheduled_markets to serve as candidate queue
ALTER TABLE scheduled_markets
  ADD COLUMN IF NOT EXISTS generated_question TEXT,
  ADD COLUMN IF NOT EXISTS generated_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS generated_options JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resolution_source TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID;

-- Migrate existing 'created' entries to 'published'
UPDATE scheduled_markets SET status = 'published' WHERE status = 'created' AND market_id IS NOT NULL;

-- Add UPDATE policy for admins
CREATE POLICY "Admins update scheduled_markets"
  ON public.scheduled_markets
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to insert suggestions
CREATE POLICY "Authenticated users can suggest markets"
  ON public.scheduled_markets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
