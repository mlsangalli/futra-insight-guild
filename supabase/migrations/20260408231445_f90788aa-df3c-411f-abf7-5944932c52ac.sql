
-- Job execution tracking table
CREATE TABLE public.job_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name text NOT NULL,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed', 'skipped')),
  duration_ms integer NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_executions ENABLE ROW LEVEL SECURITY;

-- Only admins can read
CREATE POLICY "Admins can view job executions"
  ON public.job_executions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups by job name and recency
CREATE INDEX idx_job_executions_job_name_created ON public.job_executions (job_name, created_at DESC);

-- Antifraud: suspicious_events table for flagging anomalies
CREATE TABLE public.suspicious_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.suspicious_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view suspicious events"
  ON public.suspicious_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update suspicious events"
  ON public.suspicious_events
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_suspicious_events_created ON public.suspicious_events (created_at DESC);
CREATE INDEX idx_suspicious_events_reviewed ON public.suspicious_events (reviewed, created_at DESC);
