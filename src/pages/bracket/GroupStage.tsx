import { useMemo } from 'react';
import { GroupCard } from '@/components/bracket/GroupCard';
import { Button } from '@/components/ui/button';
import { CheckCheck } from '@/lib/icons';
import type { TournamentGroup, GroupTeam, BracketLocalState } from '@/types/bracket';

interface GroupStageProps {
  groups: TournamentGroup[];
  localState: BracketLocalState;
  setGroupOrder: (groupId: string, teamIds: string[]) => void;
  disabled?: boolean;
}

export function GroupStage({ groups, localState, setGroupOrder, disabled }: GroupStageProps) {
  const getOrderedTeams = (group: TournamentGroup): GroupTeam[] => {
    const picks = localState.groupPicks[group.id];
    if (!picks || picks.length !== 4) return group.teams;
    const sorted = [...picks].sort((a, b) => a.predicted_position - b.predicted_position);
    return sorted.map(p => group.teams.find(t => t.id === p.team_id)!).filter(Boolean);
  };

  const isGroupConfirmed = (group: TournamentGroup): boolean => {
    const picks = localState.groupPicks[group.id];
    return !!picks && picks.length === 4;
  };

  const unconfirmedGroups = groups.filter(g => !isGroupConfirmed(g));
  const allConfirmed = unconfirmedGroups.length === 0;

  const confirmAllDefault = () => {
    unconfirmedGroups.forEach(g => {
      const defaultOrder = [...g.teams].sort((a, b) => a.seed_position - b.seed_position);
      setGroupOrder(g.id, defaultOrder.map(t => t.id));
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Fase de Grupos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ordene os times em cada grupo do 1º ao 4º colocado. Use as setas para reposicionar.
          </p>
        </div>
        {!disabled && !allConfirmed && (
          <Button
            variant="outline"
            size="sm"
            onClick={confirmAllDefault}
            className="shrink-0"
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Confirmar todos ({unconfirmedGroups.length})
          </Button>
        )}
        {allConfirmed && (
          <span className="text-xs font-medium text-accent flex items-center gap-1 shrink-0 mt-1">
            <CheckCheck className="h-4 w-4" />
            12/12 confirmados
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {groups.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            orderedTeams={getOrderedTeams(group)}
            onReorder={(teamIds) => setGroupOrder(group.id, teamIds)}
            disabled={disabled}
            isConfirmed={isGroupConfirmed(group)}
          />
        ))}
      </div>
    </div>
  );
}
