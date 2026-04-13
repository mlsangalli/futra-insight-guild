
-- Step 1: Clean existing data
DELETE FROM bracket_entry_knockout_picks;
DELETE FROM bracket_entry_group_picks;
DELETE FROM bracket_entries;
DELETE FROM bracket_matches;
DELETE FROM tournament_group_teams;
DELETE FROM tournament_groups;

-- Step 2: Update tournament deadline
UPDATE tournaments SET deadline = '2026-06-10T12:00:00Z' WHERE slug = 'copa-2026';

-- Step 3: Insert 12 groups
DO $$
DECLARE
  v_tid uuid;
  v_gid uuid;
BEGIN
  SELECT id INTO v_tid FROM tournaments WHERE slug = 'copa-2026';

  -- Group A
  INSERT INTO tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'A') RETURNING id INTO v_gid;
  INSERT INTO tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'México', 'MEX', '🇲🇽', 1),
    (v_gid, 'África do Sul', 'RSA', '🇿🇦', 2),
    (v_gid, 'Coreia do Sul', 'KOR', '🇰🇷', 3),
    (v_gid, 'República Tcheca', 'CZE', '🇨🇿', 4);

  -- Group B
  INSERT INTO tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'B') RETURNING id INTO v_gid;
  INSERT INTO tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Canadá', 'CAN', '🇨🇦', 1),
    (v_gid, 'Bósnia', 'BIH', '🇧🇦', 2),
    (v_gid, 'Catar', 'QAT', '🇶🇦', 3),
    (v_gid, 'Suíça', 'SUI', '🇨🇭', 4);

  -- Group C
  INSERT INTO tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'C') RETURNING id INTO v_gid;
  INSERT INTO tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Brasil', 'BRA', '🇧🇷', 1),
    (v_gid, 'Marrocos', 'MAR', '🇲🇦', 2),
    (v_gid, 'Haiti', 'HAI', '🇭🇹', 3),
    (v_gid, 'Escócia', 'SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 4);

  -- Group D
  INSERT INTO tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'D') RETURNING id INTO v_gid;
  INSERT INTO tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Estados Unidos', 'USA', '🇺🇸', 1),
    (v_gid, 'Paraguai', 'PAR', '🇵🇾', 2),
    (v_gid, 'Austrália', 'AUS', '🇦🇺', 3),
    (v_gid, 'Turquia', 'TUR', '🇹🇷', 4);

  -- Group E
  INSERT INTO tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'E') RETURNING id INTO v_gid;
  INSERT INTO tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Alemanha', 'GER', '🇩🇪', 1),
    (v_gid, 'Curaçao', 'CUW', '🇨🇼', 2),
    (v_gid, 'Costa do Marfim', 'CIV', '🇨🇮', 3),
    (v_gid, 'Equador', 'ECU', '🇪🇨', 4);

  -- Group F
  INSERT INTO tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'F') RETURNING id INTO v_gid;
  INSERT INTO tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Holanda', 'NED', '🇳🇱', 1),
    (v_gid, 'Japão', 'JPN', '🇯🇵', 2),
    (v_gid, 'Suécia', 'SWE', '🇸🇪', 3),
    (v_gid, 'Tunísia', 'TUN', '🇹🇳', 4);

  -- Group G
  INSERT INTO tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'G') RETURNING id INTO v_gid;
  INSERT INTO tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Bélgica', 'BEL', '🇧🇪', 1),
    (v_gid, 'Egito', 'EGY', '🇪🇬', 2),
    (v_gid, 'Irã', 'IRN', '🇮🇷', 3),
    (v_gid, 'Nova Zelândia', 'NZL', '🇳🇿', 4);

  -- Group H
  INSERT INTO tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'H') RETURNING id INTO v_gid;
  INSERT INTO tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Espanha', 'ESP', '🇪🇸', 1),
    (v_gid, 'Cabo Verde', 'CPV', '🇨🇻', 2),
    (v_gid, 'Arábia Saudita', 'KSA', '🇸🇦', 3),
    (v_gid, 'Uruguai', 'URU', '🇺🇾', 4);

  -- Group I
  INSERT INTO tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'I') RETURNING id INTO v_gid;
  INSERT INTO tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'França', 'FRA', '🇫🇷', 1),
    (v_gid, 'Senegal', 'SEN', '🇸🇳', 2),
    (v_gid, 'Iraque', 'IRQ', '🇮🇶', 3),
    (v_gid, 'Noruega', 'NOR', '🇳🇴', 4);

  -- Group J
  INSERT INTO tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'J') RETURNING id INTO v_gid;
  INSERT INTO tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Argentina', 'ARG', '🇦🇷', 1),
    (v_gid, 'Argélia', 'ALG', '🇩🇿', 2),
    (v_gid, 'Áustria', 'AUT', '🇦🇹', 3),
    (v_gid, 'Jordânia', 'JOR', '🇯🇴', 4);

  -- Group K
  INSERT INTO tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'K') RETURNING id INTO v_gid;
  INSERT INTO tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Portugal', 'POR', '🇵🇹', 1),
    (v_gid, 'RD Congo', 'COD', '🇨🇩', 2),
    (v_gid, 'Uzbequistão', 'UZB', '🇺🇿', 3),
    (v_gid, 'Colômbia', 'COL', '🇨🇴', 4);

  -- Group L
  INSERT INTO tournament_groups (tournament_id, group_letter) VALUES (v_tid, 'L') RETURNING id INTO v_gid;
  INSERT INTO tournament_group_teams (group_id, team_name, team_code, flag_emoji, seed_position) VALUES
    (v_gid, 'Inglaterra', 'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 1),
    (v_gid, 'Croácia', 'CRO', '🇭🇷', 2),
    (v_gid, 'Gana', 'GHA', '🇬🇭', 3),
    (v_gid, 'Panamá', 'PAN', '🇵🇦', 4);

  -- Step 4: Insert bracket matches
  -- R32: 16 matches (official FIFA 2026 cross-group pairings)
  -- Left side (matches 1-8)
  INSERT INTO bracket_matches (tournament_id, round, match_order, bracket_side, home_source, away_source) VALUES
    (v_tid, 'R32', 1,  'L', '1A', '2C'),
    (v_tid, 'R32', 2,  'L', '1C', '2A'),
    (v_tid, 'R32', 3,  'L', '1E', '3A_B_F'),
    (v_tid, 'R32', 4,  'L', '1G', '3C_D_E'),
    (v_tid, 'R32', 5,  'L', '1B', '2D'),
    (v_tid, 'R32', 6,  'L', '1D', '2B'),
    (v_tid, 'R32', 7,  'L', '1F', '3D_E_F'),
    (v_tid, 'R32', 8,  'L', '1H', '3A_B_C');

  -- Right side (matches 9-16)
  INSERT INTO bracket_matches (tournament_id, round, match_order, bracket_side, home_source, away_source) VALUES
    (v_tid, 'R32', 9,  'R', '1I', '2K'),
    (v_tid, 'R32', 10, 'R', '1K', '2I'),
    (v_tid, 'R32', 11, 'R', '1J', '3G_H_I'),
    (v_tid, 'R32', 12, 'R', '1L', '3J_K_L'),
    (v_tid, 'R32', 13, 'R', '2L', '2J'),
    (v_tid, 'R32', 14, 'R', '2F', '2H'),
    (v_tid, 'R32', 15, 'R', '2G', '3H_I_J'),
    (v_tid, 'R32', 16, 'R', '2E', '3F_G_L');

  -- R16: 8 matches
  INSERT INTO bracket_matches (tournament_id, round, match_order, bracket_side, home_source, away_source) VALUES
    (v_tid, 'R16', 1, 'L', 'W_R32_1', 'W_R32_2'),
    (v_tid, 'R16', 2, 'L', 'W_R32_3', 'W_R32_4'),
    (v_tid, 'R16', 3, 'L', 'W_R32_5', 'W_R32_6'),
    (v_tid, 'R16', 4, 'L', 'W_R32_7', 'W_R32_8'),
    (v_tid, 'R16', 5, 'R', 'W_R32_9', 'W_R32_10'),
    (v_tid, 'R16', 6, 'R', 'W_R32_11', 'W_R32_12'),
    (v_tid, 'R16', 7, 'R', 'W_R32_13', 'W_R32_14'),
    (v_tid, 'R16', 8, 'R', 'W_R32_15', 'W_R32_16');

  -- QF: 4 matches
  INSERT INTO bracket_matches (tournament_id, round, match_order, bracket_side, home_source, away_source) VALUES
    (v_tid, 'QF', 1, 'L', 'W_R16_1', 'W_R16_2'),
    (v_tid, 'QF', 2, 'L', 'W_R16_3', 'W_R16_4'),
    (v_tid, 'QF', 3, 'R', 'W_R16_5', 'W_R16_6'),
    (v_tid, 'QF', 4, 'R', 'W_R16_7', 'W_R16_8');

  -- SF: 2 matches
  INSERT INTO bracket_matches (tournament_id, round, match_order, bracket_side, home_source, away_source) VALUES
    (v_tid, 'SF', 1, 'L', 'W_QF_1', 'W_QF_2'),
    (v_tid, 'SF', 2, 'R', 'W_QF_3', 'W_QF_4');

  -- Final
  INSERT INTO bracket_matches (tournament_id, round, match_order, bracket_side, home_source, away_source) VALUES
    (v_tid, 'F', 1, 'N', 'W_SF_1', 'W_SF_2');

END $$;
