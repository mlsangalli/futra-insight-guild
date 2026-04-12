import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tournament, TournamentGroup, GroupTeam, BracketMatch } from '@/types/bracket';

export function useTournaments() {
  return useQuery({
    queryKey: ['tournaments'],
    queryFn: async (): Promise<Tournament[]> => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Tournament[];
    },
  });
}

export function useTournamentBySlug(slug: string) {
  return useQuery({
    queryKey: ['tournament', slug],
    queryFn: async (): Promise<Tournament | null> => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Tournament | null;
    },
    enabled: !!slug,
  });
}

export function useTournamentGroups(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['tournament-groups', tournamentId],
    queryFn: async (): Promise<TournamentGroup[]> => {
      const { data: groups, error: gErr } = await supabase
        .from('tournament_groups')
        .select('*')
        .eq('tournament_id', tournamentId!)
        .order('group_letter');
      if (gErr) throw gErr;

      const groupIds = (groups ?? []).map(g => g.id);
      const { data: teams, error: tErr } = await supabase
        .from('tournament_group_teams')
        .select('*')
        .in('group_id', groupIds)
        .order('seed_position');
      if (tErr) throw tErr;

      return (groups ?? []).map(g => ({
        ...g,
        teams: (teams ?? []).filter(t => t.group_id === g.id) as unknown as GroupTeam[],
      })) as unknown as TournamentGroup[];
    },
    enabled: !!tournamentId,
  });
}

export function useBracketMatches(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['bracket-matches', tournamentId],
    queryFn: async (): Promise<BracketMatch[]> => {
      const { data, error } = await supabase
        .from('bracket_matches')
        .select('*')
        .eq('tournament_id', tournamentId!)
        .order('match_order');
      if (error) throw error;
      return (data ?? []) as unknown as BracketMatch[];
    },
    enabled: !!tournamentId,
  });
}
