import { useMemo } from 'react';
import { MatchNode } from '@/components/bracket/MatchNode';
import { ROUND_ORDER, ROUND_LABELS } from '@/types/bracket';
import type { BracketMatch, TournamentGroup, BracketLocalState } from '@/types/bracket';

interface KnockoutBracketProps {
  matches: BracketMatch[];
  groups: TournamentGroup[];
  localState: BracketLocalState;
  resolveSource: (source: string) => string | null;
  setKnockoutPick: (matchId: string, teamName: string) => void;
  disabled?: boolean;
}

// Helper to find flag emoji for a team name
function findFlag(teamName: string | null, groups: TournamentGroup[]): string | undefined {
  if (!teamName) return undefined;
  for (const g of groups) {
    const t = g.teams.find(t => t.team_name === teamName);
    if (t) return t.flag_emoji;
  }
  return undefined;
}

export function KnockoutBracket({ matches, groups, localState, resolveSource, setKnockoutPick, disabled }: KnockoutBracketProps) {
  const matchesByRound = useMemo(() => {
    const map: Record<string, BracketMatch[]> = {};
    ROUND_ORDER.forEach(r => { map[r] = []; });
    matches.forEach(m => {
      if (map[m.round]) map[m.round].push(m);
    });
    // Sort by match_order
    Object.values(map).forEach(arr => arr.sort((a, b) => a.match_order - b.match_order));
    return map;
  }, [matches]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Mata-mata</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha o vencedor de cada confronto. As fases seguintes são preenchidas automaticamente.
        </p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {ROUND_ORDER.map(round => {
            const roundMatches = matchesByRound[round] || [];
            if (roundMatches.length === 0) return null;

            return (
              <div key={round} className="flex flex-col gap-2 shrink-0">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 text-center sticky top-0">
                  {ROUND_LABELS[round] || round}
                </h3>
                <div className="flex flex-col gap-4 justify-around flex-1">
                  {roundMatches.map(match => {
                    const homeTeam = resolveSource(match.home_source);
                    const awayTeam = resolveSource(match.away_source);
                    const chosenWinner = localState.knockoutPicks[match.id] ?? null;

                    return (
                      <MatchNode
                        key={match.id}
                        match={match}
                        homeTeam={homeTeam}
                        awayTeam={awayTeam}
                        homeFlag={findFlag(homeTeam, groups)}
                        awayFlag={findFlag(awayTeam, groups)}
                        chosenWinner={chosenWinner}
                        onPickWinner={(team) => setKnockoutPick(match.id, team)}
                        disabled={disabled}
                        isFinal={match.round === 'F'}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
