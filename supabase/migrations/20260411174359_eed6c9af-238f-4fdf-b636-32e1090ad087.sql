
-- Temporarily disable trigger that requires auth.uid()
ALTER TABLE public.markets DISABLE TRIGGER protect_market_fields_trigger;

-- Close all open markets with zero participants
UPDATE public.markets
SET status = 'closed', updated_at = now()
WHERE status = 'open'
  AND total_participants = 0;

-- Re-enable trigger
ALTER TABLE public.markets ENABLE TRIGGER protect_market_fields_trigger;
