import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTournamentGroups, useBracketMatches } from './useTournament';
import type {
  BracketEntry, GroupPick, KnockoutPick, BracketMatch,
  TournamentGroup, BracketLocalState,
} from '@/types/bracket';
import { toast } from 'sonner';

export function useBracketEntry(tournamentId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: groups } = useTournamentGroups(tournamentId);
  const { data: matches } = useBracketMatches(tournamentId);

  const [entry, setEntry] = useState<BracketEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [localState, setLocalState] = useState<BracketLocalState>({
    groupPicks: {},
    thirdPlaceQualifiers: [],
    knockoutPicks: {},
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load or create entry
  useEffect(() => {
    if (!user || !tournamentId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      // Get or create entry
      let { data: existing } = await supabase
        .from('bracket_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('tournament_id', tournamentId)
        .maybeSingle();

      if (!existing) {
        const { data: created, error } = await supabase
          .from('bracket_entries')
          .insert({ user_id: user.id, tournament_id: tournamentId })
          .select()
          .single();
        if (error) { toast.error('Erro ao criar entry'); setLoading(false); return; }
        existing = created;
      }

      setEntry(existing as unknown as BracketEntry);

      // Load group picks
      const { data: gPicks } = await supabase
        .from('bracket_entry_group_picks')
        .select('*')
        .eq('entry_id', existing!.id);

      const groupPicksMap: Record<string, GroupPick[]> = {};
      (gPicks ?? []).forEach((p: any) => {
        if (!groupPicksMap[p.group_id]) groupPicksMap[p.group_id] = [];
        groupPicksMap[p.group_id].push(p as GroupPick);
      });

      // Load knockout picks
      const { data: kPicks } = await supabase
        .from('bracket_entry_knockout_picks')
        .select('*')
        .eq('entry_id', existing!.id);

      const knockoutMap: Record<string, string> = {};
      (kPicks ?? []).forEach((p: any) => {
        knockoutMap[p.match_id] = p.chosen_team_name;
      });

      setLocalState({
        groupPicks: groupPicksMap,
        thirdPlaceQualifiers: [], // computed from group picks
        knockoutPicks: knockoutMap,
      });

      setLoading(false);
    };

    load();
  }, [user, tournamentId]);

  // Compute third-place teams from group picks
  const thirdPlaceTeams = useMemo(() => {
    if (!groups) return [];
    return groups.map(g => {
      const picks = localState.groupPicks[g.id];
      if (!picks || picks.length < 3) return null;
      const thirdPick = picks.find(p => p.predicted_position === 3);
      if (!thirdPick) return null;
      const team = g.teams.find(t => t.id === thirdPick.team_id);
      return team ? { ...team, groupLetter: g.group_letter } : null;
    }).filter(Boolean) as (import('@/types/bracket').GroupTeam & { groupLetter: string })[];
  }, [groups, localState.groupPicks]);

  // Resolve a source like "1A", "2B", "3A_B_F" (third place from groups A/B/F), "W_R32_1" to a team name
  const resolveSource = useCallback((source: string): string | null => {
    if (!groups || !matches) return null;

    // Group position source: "1A", "2B", etc.
    const groupMatch = source.match(/^(\d)([A-L])$/);
    if (groupMatch) {
      const position = parseInt(groupMatch[1]);
      const letter = groupMatch[2];
      const group = groups.find(g => g.group_letter === letter);
      if (!group) return null;
      const picks = localState.groupPicks[group.id];
      if (!picks) return null;
      const pick = picks.find(p => p.predicted_position === position);
      if (!pick) return null;
      const team = group.teams.find(t => t.id === pick.team_id);
      return team?.team_name ?? null;
    }

    // Third place pool source: "3A_B_F" means the 3rd-place qualifier from groups A, B, or F
    if (source.startsWith('3') && source.includes('_')) {
      const letters = source.substring(1).split('_');
      // Find which of the user's selected third-place qualifiers comes from one of these groups
      const qualifying = thirdPlaceTeams.filter(
        t => letters.includes(t.groupLetter) && localState.thirdPlaceQualifiers.includes(t.team_name)
      );
      return qualifying.length === 1 ? qualifying[0].team_name : null;
    }

    // Knockout winner source: "W_R32_1", "W_R16_2", etc.
    const winnerMatch = source.match(/^W_(\w+)_(\d+)$/);
    if (winnerMatch) {
      const round = winnerMatch[1];
      const order = parseInt(winnerMatch[2]);
      const match = matches.find(m => m.round === round && m.match_order === order);
      if (!match) return null;
      return localState.knockoutPicks[match.id] ?? null;
    }

    return null;
  }, [groups, matches, localState, thirdPlaceTeams]);

  // Set group picks for a group
  const setGroupOrder = useCallback((groupId: string, orderedTeamIds: string[]) => {
    setLocalState(prev => {
      const newPicks = orderedTeamIds.map((teamId, idx) => ({
        entry_id: entry!.id,
        group_id: groupId,
        team_id: teamId,
        predicted_position: idx + 1,
      }));

      // Check if any knockout picks depend on this group and need invalidation
      const group = groups?.find(g => g.id === groupId);
      const newKnockout = { ...prev.knockoutPicks };

      if (group && matches) {
        // Invalidate knockout picks that depend on changed group results
        const invalidateFromSource = (src: string): boolean => {
          const gm = src.match(/^(\d)([A-L])$/);
          return !!gm && gm[2] === group.group_letter;
        };

        const invalidateMatch = (m: BracketMatch) => {
          if (invalidateFromSource(m.home_source) || invalidateFromSource(m.away_source)) {
            delete newKnockout[m.id];
            // Also invalidate downstream
            const downstreamSrc = `W_${m.round}_${m.match_order}`;
            matches.filter(dm => dm.home_source === downstreamSrc || dm.away_source === downstreamSrc)
              .forEach(invalidateMatch);
          }
        };

        matches.filter(m => m.round === 'R32').forEach(invalidateMatch);
      }

      return {
        ...prev,
        groupPicks: { ...prev.groupPicks, [groupId]: newPicks },
        knockoutPicks: newKnockout,
      };
    });

    scheduleSave();
  }, [entry, groups, matches]);

  // Set third place qualifiers
  const setThirdPlaceQualifiers = useCallback((qualifiers: string[]) => {
    setLocalState(prev => {
      // Invalidate knockout picks that depend on 3rd place
      const newKnockout = { ...prev.knockoutPicks };
      if (matches) {
        const invalidateMatch = (m: BracketMatch) => {
          const isThirdSource = (s: string) => s.startsWith('3') && s.includes('_') && !s.startsWith('W_');
          if (isThirdSource(m.home_source) || isThirdSource(m.away_source)) {
            delete newKnockout[m.id];
            const downstreamSrc = `W_${m.round}_${m.match_order}`;
            matches.filter(dm => dm.home_source === downstreamSrc || dm.away_source === downstreamSrc)
              .forEach(invalidateMatch);
          }
        };
        matches.filter(m => m.round === 'R32').forEach(invalidateMatch);
      }

      return { ...prev, thirdPlaceQualifiers: qualifiers, knockoutPicks: newKnockout };
    });
    scheduleSave();
  }, [matches]);

  // Set knockout pick
  const setKnockoutPick = useCallback((matchId: string, teamName: string) => {
    setLocalState(prev => {
      const newKnockout = { ...prev.knockoutPicks, [matchId]: teamName };

      // Invalidate downstream
      if (matches) {
        const match = matches.find(m => m.id === matchId);
        if (match) {
          const downstreamSrc = `W_${match.round}_${match.match_order}`;
          const invalidateDown = (src: string) => {
            matches.filter(dm => dm.home_source === src || dm.away_source === src).forEach(dm => {
              delete newKnockout[dm.id];
              invalidateDown(`W_${dm.round}_${dm.match_order}`);
            });
          };
          invalidateDown(downstreamSrc);
        }
      }

      return { ...prev, knockoutPicks: newKnockout };
    });
    scheduleSave();
  }, [matches]);

  // Progress calculation
  const progress = useMemo(() => {
    if (!groups || !matches) return 0;

    const totalGroups = groups.length;
    const completedGroups = groups.filter(g => {
      const picks = localState.groupPicks[g.id];
      return picks && picks.length === 4;
    }).length;

    const thirdsComplete = localState.thirdPlaceQualifiers.length === 8 ? 1 : 0;
    const totalMatches = matches.length;
    const completedMatches = Object.keys(localState.knockoutPicks).length;

    // Weight: groups 30%, thirds 10%, knockout 60%
    const groupProgress = totalGroups > 0 ? completedGroups / totalGroups : 0;
    const knockoutProgress = totalMatches > 0 ? completedMatches / totalMatches : 0;

    return Math.round((groupProgress * 30 + thirdsComplete * 10 + knockoutProgress * 60));
  }, [groups, matches, localState]);

  // Champion
  const champion = useMemo(() => {
    if (!matches) return null;
    const final = matches.find(m => m.round === 'F');
    if (!final) return null;
    return localState.knockoutPicks[final.id] ?? null;
  }, [matches, localState.knockoutPicks]);

  // Auto-save with debounce
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistPicks();
    }, 1500);
  }, []);

  const persistPicks = useCallback(async () => {
    if (!entry) return;

    try {
      // Save group picks: delete all then re-insert
      await supabase.from('bracket_entry_group_picks').delete().eq('entry_id', entry.id);

      const allGroupPicks = Object.values(localState.groupPicks).flat().map(p => ({
        entry_id: entry.id,
        group_id: p.group_id,
        team_id: p.team_id,
        predicted_position: p.predicted_position,
      }));

      if (allGroupPicks.length > 0) {
        await supabase.from('bracket_entry_group_picks').insert(allGroupPicks);
      }

      // Save knockout picks
      await supabase.from('bracket_entry_knockout_picks').delete().eq('entry_id', entry.id);

      const allKnockoutPicks = Object.entries(localState.knockoutPicks).map(([matchId, team]) => ({
        entry_id: entry.id,
        match_id: matchId,
        chosen_team_name: team,
      }));

      if (allKnockoutPicks.length > 0) {
        await supabase.from('bracket_entry_knockout_picks').insert(allKnockoutPicks);
      }

      // Update entry progress
      await supabase.from('bracket_entries').update({
        progress_percent: progress,
        champion_pick: champion,
      }).eq('id', entry.id);

    } catch (err) {
      console.error('Failed to save bracket picks', err);
    }
  }, [entry, localState, progress, champion]);

  // Submit entry
  const submitEntry = useCallback(async () => {
    if (!entry || progress < 100) {
      toast.error('Complete todas as escolhas antes de enviar');
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    await persistPicks();

    const { error } = await supabase
      .from('bracket_entries')
      .update({ status: 'submitted', progress_percent: 100, champion_pick: champion })
      .eq('id', entry.id);

    if (error) {
      toast.error('Erro ao enviar bracket');
      return;
    }

    setEntry(prev => prev ? { ...prev, status: 'submitted' } : null);
    toast.success('Bracket enviado com sucesso!');
  }, [entry, progress, champion, persistPicks]);

  // Reset entry
  const resetEntry = useCallback(async () => {
    if (!entry) return;

    await supabase.from('bracket_entry_group_picks').delete().eq('entry_id', entry.id);
    await supabase.from('bracket_entry_knockout_picks').delete().eq('entry_id', entry.id);
    await supabase.from('bracket_entries').update({
      status: 'draft', progress_percent: 0, champion_pick: null,
    }).eq('id', entry.id);

    setLocalState({ groupPicks: {}, thirdPlaceQualifiers: [], knockoutPicks: {} });
    setEntry(prev => prev ? { ...prev, status: 'draft', progress_percent: 0, champion_pick: null } : null);
    toast.success('Bracket resetado');
  }, [entry]);

  return {
    entry,
    loading,
    localState,
    groups,
    matches,
    progress,
    champion,
    thirdPlaceTeams,
    resolveSource,
    setGroupOrder,
    setThirdPlaceQualifiers,
    setKnockoutPick,
    submitEntry,
    resetEntry,
  };
}
