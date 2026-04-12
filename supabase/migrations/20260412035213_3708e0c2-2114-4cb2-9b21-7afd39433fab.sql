
-- 1. tournaments
CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'open',
  deadline timestamptz,
  scoring_rules jsonb NOT NULL DEFAULT '{"group_correct_position":2,"group_qualified":1,"third_place_correct":2,"R32":2,"R16":4,"QF":6,"SF":10,"final":15,"champion":25}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournaments viewable by everyone" ON public.tournaments FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert tournaments" ON public.tournaments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update tournaments" ON public.tournaments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete tournaments" ON public.tournaments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. tournament_groups
CREATE TABLE public.tournament_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  group_letter text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, group_letter)
);
ALTER TABLE public.tournament_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Groups viewable by everyone" ON public.tournament_groups FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert groups" ON public.tournament_groups FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update groups" ON public.tournament_groups FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete groups" ON public.tournament_groups FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. tournament_group_teams
CREATE TABLE public.tournament_group_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  team_code text NOT NULL,
  flag_emoji text NOT NULL DEFAULT '',
  seed_position integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, seed_position)
);
ALTER TABLE public.tournament_group_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams viewable by everyone" ON public.tournament_group_teams FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert teams" ON public.tournament_group_teams FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update teams" ON public.tournament_group_teams FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete teams" ON public.tournament_group_teams FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. bracket_matches
CREATE TABLE public.bracket_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round text NOT NULL,
  match_order integer NOT NULL,
  bracket_side text NOT NULL DEFAULT 'L',
  home_source text NOT NULL,
  away_source text NOT NULL,
  official_winner text,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, round, match_order)
);
ALTER TABLE public.bracket_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches viewable by everyone" ON public.bracket_matches FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert matches" ON public.bracket_matches FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update matches" ON public.bracket_matches FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete matches" ON public.bracket_matches FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. bracket_entries
CREATE TABLE public.bracket_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  progress_percent numeric NOT NULL DEFAULT 0,
  champion_pick text,
  total_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tournament_id)
);
ALTER TABLE public.bracket_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own entries" ON public.bracket_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own entries" ON public.bracket_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own entries" ON public.bracket_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all entries" ON public.bracket_entries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all entries" ON public.bracket_entries FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_bracket_entries_updated_at BEFORE UPDATE ON public.bracket_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_bracket_entries_user ON public.bracket_entries(user_id);
CREATE INDEX idx_bracket_entries_tournament ON public.bracket_entries(tournament_id);

-- 6. bracket_entry_group_picks
CREATE TABLE public.bracket_entry_group_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.bracket_entries(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.tournament_group_teams(id) ON DELETE CASCADE,
  predicted_position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entry_id, group_id, predicted_position),
  UNIQUE(entry_id, team_id)
);
ALTER TABLE public.bracket_entry_group_picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own group picks" ON public.bracket_entry_group_picks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bracket_entries be WHERE be.id = entry_id AND be.user_id = auth.uid()));
CREATE POLICY "Users create own group picks" ON public.bracket_entry_group_picks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.bracket_entries be WHERE be.id = entry_id AND be.user_id = auth.uid()));
CREATE POLICY "Users update own group picks" ON public.bracket_entry_group_picks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bracket_entries be WHERE be.id = entry_id AND be.user_id = auth.uid()));
CREATE POLICY "Users delete own group picks" ON public.bracket_entry_group_picks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bracket_entries be WHERE be.id = entry_id AND be.user_id = auth.uid()));
CREATE INDEX idx_group_picks_entry ON public.bracket_entry_group_picks(entry_id);

-- 7. bracket_entry_knockout_picks
CREATE TABLE public.bracket_entry_knockout_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.bracket_entries(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.bracket_matches(id) ON DELETE CASCADE,
  chosen_team_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entry_id, match_id)
);
ALTER TABLE public.bracket_entry_knockout_picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own knockout picks" ON public.bracket_entry_knockout_picks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bracket_entries be WHERE be.id = entry_id AND be.user_id = auth.uid()));
CREATE POLICY "Users create own knockout picks" ON public.bracket_entry_knockout_picks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.bracket_entries be WHERE be.id = entry_id AND be.user_id = auth.uid()));
CREATE POLICY "Users update own knockout picks" ON public.bracket_entry_knockout_picks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bracket_entries be WHERE be.id = entry_id AND be.user_id = auth.uid()));
CREATE POLICY "Users delete own knockout picks" ON public.bracket_entry_knockout_picks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bracket_entries be WHERE be.id = entry_id AND be.user_id = auth.uid()));
CREATE INDEX idx_knockout_picks_entry ON public.bracket_entry_knockout_picks(entry_id);

-- SEED DATA
DO $$
DECLARE
  v_tid uuid;
  v_gid uuid;
BEGIN
  INSERT INTO public.tournaments (name, slug, status, deadline)
  VALUES ('Copa do Mundo 2026', 'copa-2026', 'open', '2026-06-11T00:00:00Z')
  RETURNING id INTO v_tid;

  -- Group A
  INSERT INTO public.tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'A') RETURNING id INTO v_gid;
  INSERT INTO public.tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Estados Unidos', 'USA', '🇺🇸', 1), (v_gid, 'Países Baixos', 'NED', '🇳🇱', 2),
    (v_gid, 'Senegal', 'SEN', '🇸🇳', 3), (v_gid, 'Costa Rica', 'CRC', '🇨🇷', 4);

  -- Group B
  INSERT INTO public.tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'B') RETURNING id INTO v_gid;
  INSERT INTO public.tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'México', 'MEX', '🇲🇽', 1), (v_gid, 'Portugal', 'POR', '🇵🇹', 2),
    (v_gid, 'Marrocos', 'MAR', '🇲🇦', 3), (v_gid, 'Equador', 'ECU', '🇪🇨', 4);

  -- Group C
  INSERT INTO public.tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'C') RETURNING id INTO v_gid;
  INSERT INTO public.tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Canadá', 'CAN', '🇨🇦', 1), (v_gid, 'Alemanha', 'GER', '🇩🇪', 2),
    (v_gid, 'Japão', 'JPN', '🇯🇵', 3), (v_gid, 'Nigéria', 'NGA', '🇳🇬', 4);

  -- Group D
  INSERT INTO public.tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'D') RETURNING id INTO v_gid;
  INSERT INTO public.tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Brasil', 'BRA', '🇧🇷', 1), (v_gid, 'França', 'FRA', '🇫🇷', 2),
    (v_gid, 'Coreia do Sul', 'KOR', '🇰🇷', 3), (v_gid, 'Arábia Saudita', 'KSA', '🇸🇦', 4);

  -- Group E
  INSERT INTO public.tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'E') RETURNING id INTO v_gid;
  INSERT INTO public.tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Argentina', 'ARG', '🇦🇷', 1), (v_gid, 'Inglaterra', 'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 2),
    (v_gid, 'Austrália', 'AUS', '🇦🇺', 3), (v_gid, 'Camarões', 'CMR', '🇨🇲', 4);

  -- Group F
  INSERT INTO public.tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'F') RETURNING id INTO v_gid;
  INSERT INTO public.tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Espanha', 'ESP', '🇪🇸', 1), (v_gid, 'Bélgica', 'BEL', '🇧🇪', 2),
    (v_gid, 'Uruguai', 'URU', '🇺🇾', 3), (v_gid, 'Irã', 'IRN', '🇮🇷', 4);

  -- Group G
  INSERT INTO public.tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'G') RETURNING id INTO v_gid;
  INSERT INTO public.tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Itália', 'ITA', '🇮🇹', 1), (v_gid, 'Colômbia', 'COL', '🇨🇴', 2),
    (v_gid, 'Gana', 'GHA', '🇬🇭', 3), (v_gid, 'Tunísia', 'TUN', '🇹🇳', 4);

  -- Group H
  INSERT INTO public.tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'H') RETURNING id INTO v_gid;
  INSERT INTO public.tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Croácia', 'CRO', '🇭🇷', 1), (v_gid, 'Dinamarca', 'DEN', '🇩🇰', 2),
    (v_gid, 'Peru', 'PER', '🇵🇪', 3), (v_gid, 'Nova Zelândia', 'NZL', '🇳🇿', 4);

  -- Group I
  INSERT INTO public.tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'I') RETURNING id INTO v_gid;
  INSERT INTO public.tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Suíça', 'SUI', '🇨🇭', 1), (v_gid, 'Sérvia', 'SRB', '🇷🇸', 2),
    (v_gid, 'Egito', 'EGY', '🇪🇬', 3), (v_gid, 'Panamá', 'PAN', '🇵🇦', 4);

  -- Group J
  INSERT INTO public.tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'J') RETURNING id INTO v_gid;
  INSERT INTO public.tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Polônia', 'POL', '🇵🇱', 1), (v_gid, 'Chile', 'CHI', '🇨🇱', 2),
    (v_gid, 'Argélia', 'ALG', '🇩🇿', 3), (v_gid, 'Honduras', 'HON', '🇭🇳', 4);

  -- Group K
  INSERT INTO public.tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'K') RETURNING id INTO v_gid;
  INSERT INTO public.tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Áustria', 'AUT', '🇦🇹', 1), (v_gid, 'Paraguai', 'PAR', '🇵🇾', 2),
    (v_gid, 'Mali', 'MLI', '🇲🇱', 3), (v_gid, 'Barein', 'BHR', '🇧🇭', 4);

  -- Group L
  INSERT INTO public.tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'L') RETURNING id INTO v_gid;
  INSERT INTO public.tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Ucrânia', 'UKR', '🇺🇦', 1), (v_gid, 'Venezuela', 'VEN', '🇻🇪', 2),
    (v_gid, 'Costa do Marfim', 'CIV', '🇨🇮', 3), (v_gid, 'Jamaica', 'JAM', '🇯🇲', 4);

  -- R32 (16 matches)
  INSERT INTO public.bracket_matches (tournament_id, round, match_order, bracket_side, home_source, away_source) VALUES
    (v_tid, 'R32', 1, 'L', '1A', '3rd_1'), (v_tid, 'R32', 2, 'L', '2C', '2D'),
    (v_tid, 'R32', 3, 'L', '1B', '3rd_2'), (v_tid, 'R32', 4, 'L', '2A', '2B'),
    (v_tid, 'R32', 5, 'L', '1E', '3rd_3'), (v_tid, 'R32', 6, 'L', '2G', '2H'),
    (v_tid, 'R32', 7, 'L', '1F', '3rd_4'), (v_tid, 'R32', 8, 'L', '2E', '2F'),
    (v_tid, 'R32', 9, 'R', '1C', '3rd_5'), (v_tid, 'R32', 10, 'R', '2I', '2J'),
    (v_tid, 'R32', 11, 'R', '1D', '3rd_6'), (v_tid, 'R32', 12, 'R', '2K', '2L'),
    (v_tid, 'R32', 13, 'R', '1G', '3rd_7'), (v_tid, 'R32', 14, 'R', '1I', '2L'),
    (v_tid, 'R32', 15, 'R', '1H', '3rd_8'), (v_tid, 'R32', 16, 'R', '1J', '2H');

  -- R16 (8 matches)
  INSERT INTO public.bracket_matches (tournament_id, round, match_order, bracket_side, home_source, away_source) VALUES
    (v_tid, 'R16', 1, 'L', 'W_R32_1', 'W_R32_2'), (v_tid, 'R16', 2, 'L', 'W_R32_3', 'W_R32_4'),
    (v_tid, 'R16', 3, 'L', 'W_R32_5', 'W_R32_6'), (v_tid, 'R16', 4, 'L', 'W_R32_7', 'W_R32_8'),
    (v_tid, 'R16', 5, 'R', 'W_R32_9', 'W_R32_10'), (v_tid, 'R16', 6, 'R', 'W_R32_11', 'W_R32_12'),
    (v_tid, 'R16', 7, 'R', 'W_R32_13', 'W_R32_14'), (v_tid, 'R16', 8, 'R', 'W_R32_15', 'W_R32_16');

  -- QF (4 matches)
  INSERT INTO public.bracket_matches (tournament_id, round, match_order, bracket_side, home_source, away_source) VALUES
    (v_tid, 'QF', 1, 'L', 'W_R16_1', 'W_R16_2'), (v_tid, 'QF', 2, 'L', 'W_R16_3', 'W_R16_4'),
    (v_tid, 'QF', 3, 'R', 'W_R16_5', 'W_R16_6'), (v_tid, 'QF', 4, 'R', 'W_R16_7', 'W_R16_8');

  -- SF (2 matches)
  INSERT INTO public.bracket_matches (tournament_id, round, match_order, bracket_side, home_source, away_source) VALUES
    (v_tid, 'SF', 1, 'L', 'W_QF_1', 'W_QF_2'), (v_tid, 'SF', 2, 'R', 'W_QF_3', 'W_QF_4');

  -- Final
  INSERT INTO public.bracket_matches (tournament_id, round, match_order, bracket_side, home_source, away_source) VALUES
    (v_tid, 'F', 1, 'N', 'W_SF_1', 'W_SF_2');
END $$;
