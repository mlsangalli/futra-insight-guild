
-- Create influence level enum
CREATE TYPE public.influence_level AS ENUM ('low', 'medium', 'high', 'elite');

-- Create market status enum
CREATE TYPE public.market_status AS ENUM ('open', 'closed', 'resolved');

-- Create market category enum
CREATE TYPE public.market_category AS ENUM ('politics', 'economy', 'crypto', 'football', 'culture', 'technology');

-- Create prediction status enum
CREATE TYPE public.prediction_status AS ENUM ('pending', 'won', 'lost');

-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  futra_credits INTEGER NOT NULL DEFAULT 1000,
  futra_score INTEGER NOT NULL DEFAULT 0,
  influence_level influence_level NOT NULL DEFAULT 'low',
  total_predictions INTEGER NOT NULL DEFAULT 0,
  resolved_predictions INTEGER NOT NULL DEFAULT 0,
  accuracy_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  global_rank INTEGER NOT NULL DEFAULT 0,
  specialties TEXT[] DEFAULT '{}',
  streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', 'New User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Markets table
CREATE TABLE public.markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category market_category NOT NULL,
  type TEXT NOT NULL DEFAULT 'binary' CHECK (type IN ('binary', 'multiple')),
  options JSONB NOT NULL DEFAULT '[]',
  end_date TIMESTAMPTZ NOT NULL,
  status market_status NOT NULL DEFAULT 'open',
  resolution_rules TEXT DEFAULT '',
  resolution_source TEXT DEFAULT '',
  resolved_option TEXT,
  total_credits INTEGER NOT NULL DEFAULT 0,
  total_participants INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT false,
  trending BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Markets are viewable by everyone" ON public.markets FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create markets" ON public.markets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update own markets" ON public.markets FOR UPDATE USING (auth.uid() = created_by);

CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON public.markets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Predictions table
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  market_id UUID REFERENCES public.markets(id) ON DELETE CASCADE NOT NULL,
  selected_option TEXT NOT NULL,
  credits_allocated INTEGER NOT NULL CHECK (credits_allocated > 0),
  status prediction_status NOT NULL DEFAULT 'pending',
  reward INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, market_id)
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Predictions are viewable by everyone" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "Users can create own predictions" ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions" ON public.predictions FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_global_rank ON public.profiles(global_rank);
CREATE INDEX idx_profiles_futra_score ON public.profiles(futra_score DESC);
CREATE INDEX idx_markets_category ON public.markets(category);
CREATE INDEX idx_markets_status ON public.markets(status);
CREATE INDEX idx_markets_end_date ON public.markets(end_date);
CREATE INDEX idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX idx_predictions_market_id ON public.predictions(market_id);

-- Function to place a prediction (handles credit deduction and market stats update)
CREATE OR REPLACE FUNCTION public.place_prediction(
  p_market_id UUID,
  p_selected_option TEXT,
  p_credits INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_credits INTEGER;
  v_prediction_id UUID;
  v_market_status market_status;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check market is open
  SELECT status INTO v_market_status FROM public.markets WHERE id = p_market_id;
  IF v_market_status IS NULL THEN
    RAISE EXCEPTION 'Market not found';
  END IF;
  IF v_market_status != 'open' THEN
    RAISE EXCEPTION 'Market is not open';
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
$$;
