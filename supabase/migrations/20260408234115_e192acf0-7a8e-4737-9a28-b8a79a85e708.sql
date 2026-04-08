
UPDATE public.markets 
SET status = 'closed', updated_at = now()
WHERE status = 'open' 
  AND (question LIKE '%2020%' OR question LIKE '%2021%' OR question LIKE '%2022%' OR question LIKE '%2023%' OR question LIKE '%2024%')
  AND created_at >= '2026-04-07'
  AND total_participants = 0;
