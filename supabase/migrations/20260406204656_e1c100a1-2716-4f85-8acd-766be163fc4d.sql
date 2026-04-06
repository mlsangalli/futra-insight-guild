
-- credit_transactions table
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_tx_user ON public.credit_transactions(user_id, created_at DESC);
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transactions" ON public.credit_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON public.credit_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users mark own as read" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- watchlist table
CREATE TABLE public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, market_id)
);
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watchlist" ON public.watchlist FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_market ON public.comments(market_id, created_at DESC);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read comments" ON public.comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth users create comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users edit own comments" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- profiles additions
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_daily_bonus TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID;

UPDATE public.profiles SET referral_code = LEFT(user_id::text, 8) WHERE referral_code IS NULL;

CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := LEFT(NEW.user_id::text, 8);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profile_referral_code BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

-- Full-text search on markets using trigger (to_tsvector is not immutable)
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_markets_search ON public.markets USING gin(search_vector);

CREATE OR REPLACE FUNCTION public.update_market_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.question, '') || ' ' || coalesce(NEW.description, '') || ' ' || coalesce(NEW.category::text, ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_market_search BEFORE INSERT OR UPDATE ON public.markets FOR EACH ROW EXECUTE FUNCTION public.update_market_search_vector();

-- Backfill existing markets
UPDATE public.markets SET search_vector = to_tsvector('english', coalesce(question, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category::text, ''));

-- Updated place_prediction with credit_transaction
CREATE OR REPLACE FUNCTION public.place_prediction(p_market_id uuid, p_selected_option text, p_credits integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID; v_current_credits INTEGER; v_prediction_id UUID;
  v_market_status market_status; v_lock_date TIMESTAMPTZ; v_total_market_credits INTEGER; v_market_question TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT status, lock_date, question INTO v_market_status, v_lock_date, v_market_question FROM public.markets WHERE id = p_market_id;
  IF v_market_status IS NULL THEN RAISE EXCEPTION 'Market not found'; END IF;
  IF v_market_status != 'open' THEN RAISE EXCEPTION 'Market is not open'; END IF;
  IF v_lock_date IS NOT NULL AND v_lock_date <= NOW() THEN RAISE EXCEPTION 'Market is locked for predictions'; END IF;
  SELECT futra_credits INTO v_current_credits FROM public.profiles WHERE user_id = v_user_id;
  IF v_current_credits < p_credits THEN RAISE EXCEPTION 'Insufficient credits'; END IF;
  IF EXISTS (SELECT 1 FROM public.predictions WHERE user_id = v_user_id AND market_id = p_market_id) THEN RAISE EXCEPTION 'Already predicted on this market'; END IF;

  UPDATE public.profiles SET futra_credits = futra_credits - p_credits, total_predictions = total_predictions + 1 WHERE user_id = v_user_id;
  INSERT INTO public.predictions (user_id, market_id, selected_option, credits_allocated) VALUES (v_user_id, p_market_id, p_selected_option, p_credits) RETURNING id INTO v_prediction_id;
  INSERT INTO public.credit_transactions (user_id, amount, type, reference_id, description) VALUES (v_user_id, -p_credits, 'prediction_placed', p_market_id, 'Prediction: ' || v_market_question);

  UPDATE public.market_options SET total_votes = total_votes + 1, total_credits = total_credits + p_credits WHERE market_id = p_market_id AND id = p_selected_option::uuid;
  SELECT COALESCE(SUM(total_credits), 0) INTO v_total_market_credits FROM public.market_options WHERE market_id = p_market_id;
  IF v_total_market_credits > 0 THEN
    UPDATE public.market_options SET percentage = ROUND((total_credits::numeric / v_total_market_credits) * 100, 1) WHERE market_id = p_market_id;
  END IF;
  UPDATE public.markets SET total_credits = total_credits + p_credits, total_participants = total_participants + 1 WHERE id = p_market_id;
  RETURN v_prediction_id;
END;
$$;

-- Updated resolve_market_and_score with credit_transactions + notifications
CREATE OR REPLACE FUNCTION public.resolve_market_and_score(p_market_id uuid, p_winning_option uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total_pool INTEGER; v_total_winning_credits INTEGER; v_winners_count INTEGER := 0;
  v_total_predictions INTEGER := 0; v_market_question TEXT; v_winning_label TEXT; rec RECORD; v_reward INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM markets WHERE id = p_market_id AND status != 'resolved') THEN RAISE EXCEPTION 'Market not found or already resolved'; END IF;
  IF NOT EXISTS (SELECT 1 FROM market_options WHERE id = p_winning_option AND market_id = p_market_id) THEN RAISE EXCEPTION 'Invalid winning option for this market'; END IF;
  SELECT question INTO v_market_question FROM markets WHERE id = p_market_id;
  SELECT label INTO v_winning_label FROM market_options WHERE id = p_winning_option;
  UPDATE markets SET status = 'resolved', resolved_option = p_winning_option::text WHERE id = p_market_id;
  SELECT COALESCE(SUM(credits_allocated), 0) INTO v_total_pool FROM predictions WHERE market_id = p_market_id;
  SELECT COALESCE(SUM(credits_allocated), 0) INTO v_total_winning_credits FROM predictions WHERE market_id = p_market_id AND selected_option = p_winning_option::text;
  SELECT COUNT(*) INTO v_total_predictions FROM predictions WHERE market_id = p_market_id;

  FOR rec IN SELECT id, user_id, credits_allocated FROM predictions WHERE market_id = p_market_id AND selected_option = p_winning_option::text LOOP
    v_reward := CASE WHEN v_total_winning_credits > 0 THEN FLOOR((rec.credits_allocated::numeric / v_total_winning_credits) * v_total_pool) ELSE 0 END;
    UPDATE predictions SET status = 'won', reward = v_reward WHERE id = rec.id;
    UPDATE profiles SET futra_credits = futra_credits + v_reward WHERE user_id = rec.user_id;
    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description) VALUES (rec.user_id, v_reward, 'prediction_won', p_market_id, 'Won: ' || v_market_question);
    INSERT INTO notifications (user_id, type, title, body, data) VALUES (rec.user_id, 'credits_won', 'You won ' || v_reward || ' credits!', 'Your prediction on "' || v_market_question || '" was correct. Result: ' || v_winning_label, jsonb_build_object('market_id', p_market_id, 'reward', v_reward));
    PERFORM calculate_user_scores(rec.user_id);
    v_winners_count := v_winners_count + 1;
  END LOOP;

  FOR rec IN SELECT DISTINCT id, user_id, credits_allocated FROM predictions WHERE market_id = p_market_id AND selected_option != p_winning_option::text LOOP
    UPDATE predictions SET status = 'lost', reward = 0 WHERE id = rec.id;
    INSERT INTO credit_transactions (user_id, amount, type, reference_id, description) VALUES (rec.user_id, -rec.credits_allocated, 'prediction_lost', p_market_id, 'Lost: ' || v_market_question);
    INSERT INTO notifications (user_id, type, title, body, data) VALUES (rec.user_id, 'credits_lost', 'Market resolved', 'Your prediction on "' || v_market_question || '" was incorrect. Result: ' || v_winning_label, jsonb_build_object('market_id', p_market_id));
    PERFORM calculate_user_scores(rec.user_id);
  END LOOP;

  IF v_winners_count = 0 AND v_total_predictions > 0 THEN
    FOR rec IN SELECT id, user_id, credits_allocated FROM predictions WHERE market_id = p_market_id LOOP
      UPDATE profiles SET futra_credits = futra_credits + rec.credits_allocated WHERE user_id = rec.user_id;
      INSERT INTO credit_transactions (user_id, amount, type, reference_id, description) VALUES (rec.user_id, rec.credits_allocated, 'prediction_won', p_market_id, 'Refund: ' || v_market_question);
    END LOOP;
  END IF;

  PERFORM recalculate_global_ranks();
  RETURN jsonb_build_object('success', true, 'total_predictions', v_total_predictions, 'winners_count', v_winners_count, 'total_pool', v_total_pool, 'refunded', v_winners_count = 0 AND v_total_predictions > 0);
END;
$$;
