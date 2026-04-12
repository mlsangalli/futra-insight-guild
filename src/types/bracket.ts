export interface Tournament {
  id: string;
  name: string;
  slug: string;
  status: 'open' | 'locked' | 'scored';
  deadline: string | null;
  scoring_rules: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface TournamentGroup {
  id: string;
  tournament_id: string;
  group_letter: string;
  created_at: string;
  teams: GroupTeam[];
}

export interface GroupTeam {
  id: string;
  group_id: string;
  team_name: string;
  team_code: string;
  flag_emoji: string;
  seed_position: number;
  created_at: string;
}

export interface BracketMatch {
  id: string;
  tournament_id: string;
  round: 'R32' | 'R16' | 'QF' | 'SF' | 'F';
  match_order: number;
  bracket_side: 'L' | 'R' | 'N';
  home_source: string;
  away_source: string;
  official_winner: string | null;
  is_locked: boolean;
  created_at: string;
}

export interface BracketEntry {
  id: string;
  user_id: string;
  tournament_id: string;
  status: 'draft' | 'submitted' | 'scored';
  progress_percent: number;
  champion_pick: string | null;
  total_score: number;
  created_at: string;
  updated_at: string;
}

export interface GroupPick {
  id?: string;
  entry_id: string;
  group_id: string;
  team_id: string;
  predicted_position: number;
}

export interface KnockoutPick {
  id?: string;
  entry_id: string;
  match_id: string;
  chosen_team_name: string;
}

// Local state for the bracket entry
export interface BracketLocalState {
  groupPicks: Record<string, GroupPick[]>; // keyed by group_id
  thirdPlaceQualifiers: string[]; // team_names of the 8 qualifying 3rd place teams
  knockoutPicks: Record<string, string>; // keyed by match_id → chosen_team_name
}

export const ROUND_ORDER: BracketMatch['round'][] = ['R32', 'R16', 'QF', 'SF', 'F'];
export const ROUND_LABELS: Record<string, string> = {
  R32: 'Oitavas de Final (R32)',
  R16: 'Oitavas',
  QF: 'Quartas de Final',
  SF: 'Semifinais',
  F: 'Final',
};

export const BRACKET_STEPS = [
  { key: 'groups', label: 'Grupos', description: 'Ordene os times em cada grupo' },
  { key: 'thirds', label: 'Terceiros', description: 'Selecione os melhores terceiros' },
  { key: 'knockout', label: 'Mata-mata', description: 'Escolha quem avança' },
  { key: 'summary', label: 'Resumo', description: 'Revise e envie' },
] as const;

export type BracketStep = typeof BRACKET_STEPS[number]['key'];
