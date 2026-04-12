import { useMemo, useState } from 'react';
import { GroupCard } from '@/components/bracket/GroupCard';
import type { TournamentGroup, GroupTeam, BracketLocalState } from '@/types/bracket';

interface GroupStageProps {
  groups: TournamentGroup[];
  localState: BracketLocalState;
  setGroupOrder: (groupId: string, teamIds: string[]) => void;
  disabled?: boolean;
}

export function GroupStage({ groups, localState, setGroupOrder, disabled }: GroupStageProps) {
  // For each group, determine the current order
  const getOrderedTeams = (group: TournamentGroup): GroupTeam[] => {
    const picks = localState.groupPicks[group.id];
    if (!picks || picks.length !== 4) return group.teams;

    // Sort by predicted_position
    const sorted = [...picks].sort((a, b) => a.predicted_position - b.predicted_position);
    return sorted.map(p => group.teams.find(t => t.id === p.team_id)!).filter(Boolean);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Fase de Grupos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ordene os times em cada grupo do 1º ao 4º colocado. Use as setas para reposicionar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {groups.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            orderedTeams={getOrderedTeams(group)}
            onReorder={(teamIds) => setGroupOrder(group.id, teamIds)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
