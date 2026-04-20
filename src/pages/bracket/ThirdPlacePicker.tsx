import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check } from '@/lib/icons';
import type { GroupTeam, TournamentGroup, BracketLocalState } from '@/types/bracket';

interface ThirdPlacePickerProps {
  groups: TournamentGroup[];
  localState: BracketLocalState;
  setThirdPlaceQualifiers: (qualifiers: string[]) => void;
  disabled?: boolean;
}

export function ThirdPlacePicker({ groups, localState, setThirdPlaceQualifiers, disabled }: ThirdPlacePickerProps) {
  // Get the third-place team from each group based on group picks
  const thirdPlaceTeams = useMemo(() => {
    return groups.map(g => {
      const picks = localState.groupPicks[g.id];
      if (!picks || picks.length < 3) return null;
      const thirdPick = picks.find(p => p.predicted_position === 3);
      if (!thirdPick) return null;
      const team = g.teams.find(t => t.id === thirdPick.team_id);
      return team ? { ...team, groupLetter: g.group_letter } : null;
    }).filter(Boolean) as (GroupTeam & { groupLetter: string })[];
  }, [groups, localState.groupPicks]);

  const selectedNames = localState.thirdPlaceQualifiers;

  const toggleTeam = (teamName: string) => {
    if (disabled) return;
    if (selectedNames.includes(teamName)) {
      setThirdPlaceQualifiers(selectedNames.filter(n => n !== teamName));
    } else if (selectedNames.length < 8) {
      setThirdPlaceQualifiers([...selectedNames, teamName]);
    }
  };

  const incompleteGroups = groups.length - thirdPlaceTeams.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Melhores Terceiros</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione <strong>8</strong> dos 12 terceiros colocados que avançam para o mata-mata.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className={cn(
            'text-xs font-bold px-2 py-1 rounded-full',
            selectedNames.length === 8 ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'
          )}>
            {selectedNames.length}/8 selecionados
          </span>
        </div>
      </div>

      {incompleteGroups > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm text-warning">
            Complete a fase de grupos primeiro. {incompleteGroups} grupo(s) pendente(s).
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {thirdPlaceTeams.map(team => {
          const isSelected = selectedNames.includes(team.team_name);
          return (
            <button
              key={team.id}
              onClick={() => toggleTeam(team.team_name)}
              disabled={disabled || (!isSelected && selectedNames.length >= 8)}
              className={cn(
                'flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 text-left',
                isSelected
                  ? 'border-accent bg-accent/10 shadow-[0_0_12px_hsl(var(--accent)/0.15)]'
                  : 'border-border bg-card hover:border-primary/50',
                disabled && 'opacity-50 cursor-not-allowed',
                !isSelected && selectedNames.length >= 8 && 'opacity-40 cursor-not-allowed',
              )}
            >
              <span className="text-2xl">{team.flag_emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{team.team_name}</p>
                <p className="text-[10px] text-muted-foreground">3º Grupo {team.groupLetter}</p>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-accent-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
