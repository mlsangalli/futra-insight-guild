
-- Add lock_date column
ALTER TABLE public.markets ADD COLUMN lock_date timestamptz DEFAULT NULL;

-- Update place_prediction to check lock_date
CREATE OR REPLACE FUNCTION public.place_prediction(p_market_id uuid, p_selected_option text, p_credits integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_current_credits INTEGER;
  v_prediction_id UUID;
  v_market_status market_status;
  v_lock_date TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check market is open
  SELECT status, lock_date INTO v_market_status, v_lock_date FROM public.markets WHERE id = p_market_id;
  IF v_market_status IS NULL THEN
    RAISE EXCEPTION 'Market not found';
  END IF;
  IF v_market_status != 'open' THEN
    RAISE EXCEPTION 'Market is not open';
  END IF;

  -- Check lock_date
  IF v_lock_date IS NOT NULL AND v_lock_date <= NOW() THEN
    RAISE EXCEPTION 'Market is locked for predictions';
  END IF;

  -- Check user has enough credits
  SELECT futra_credits INTO v_current_credits FROM public.profiles WHERE user_id = v_user_id;
  IF v_current_credits < p_credits THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Check no existing prediction
  IF EXISTS (SELECT 1 FROM public.predictions WHERE user_id = v_user_id AND market_id = p_market_id) THEN
    RAISE EXCEPTION 'Already predicted on this market';
  END IF;

  -- Deduct credits
  UPDATE public.profiles SET futra_credits = futra_credits - p_credits, total_predictions = total_predictions + 1 WHERE user_id = v_user_id;

  -- Insert prediction
  INSERT INTO public.predictions (user_id, market_id, selected_option, credits_allocated)
  VALUES (v_user_id, p_market_id, p_selected_option, p_credits)
  RETURNING id INTO v_prediction_id;

  -- Update market stats
  UPDATE public.markets
  SET total_credits = total_credits + p_credits,
      total_participants = total_participants + 1,
      options = (
        SELECT jsonb_agg(
          CASE WHEN opt->>'id' = p_selected_option
            THEN jsonb_set(
              jsonb_set(opt, '{votes}', to_jsonb((opt->>'votes')::int + 1)),
              '{creditsAllocated}', to_jsonb((opt->>'creditsAllocated')::int + p_credits)
            )
            ELSE opt
          END
        )
        FROM jsonb_array_elements(options) opt
      )
  WHERE id = p_market_id;

  RETURN v_prediction_id;
END;
$function$;
