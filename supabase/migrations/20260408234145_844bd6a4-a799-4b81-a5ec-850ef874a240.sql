
UPDATE public.markets 
SET status = 'closed'::market_status, updated_at = now()
WHERE status = 'open'::market_status
  AND total_participants = 0
  AND created_at >= '2026-04-07'::timestamptz
  AND (
    question LIKE '%2020%' 
    OR question LIKE '%2021%' 
    OR question LIKE '%2022%' 
    OR question LIKE '%2023%' 
    OR question LIKE '%2024%'
  );
