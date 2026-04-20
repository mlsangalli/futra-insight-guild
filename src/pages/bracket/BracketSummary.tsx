import { Trophy, Users, Target, RotateCcw, Share2, Send } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import type { BracketEntry, TournamentGroup, BracketLocalState } from '@/types/bracket';
import { cn } from '@/lib/utils';

interface BracketSummaryProps {
  entry: BracketEntry;
  champion: string | null;
  progress: number;
  groups: TournamentGroup[];
  localState: BracketLocalState;
  resolveSource: (source: string) => string | null;
  onSubmit: () => void;
  onReset: () => void;
}

// Find flag
function findFlag(name: string | null, groups: TournamentGroup[]): string {
  if (!name) return '🏳️';
  for (const g of groups) {
    const t = g.teams.find(t => t.team_name === name);
    if (t) return t.flag_emoji;
  }
  return '🏳️';
}

export function BracketSummary({ entry, champion, progress, groups, localState, resolveSource, onSubmit, onReset }: BracketSummaryProps) {
  const isComplete = progress >= 100;
  const isSubmitted = entry.status === 'submitted';

  // Count completed picks
  const groupsComplete = Object.values(localState.groupPicks).filter(p => p.length === 4).length;
  const thirdsComplete = localState.thirdPlaceQualifiers.length;
  const knockoutComplete = Object.keys(localState.knockoutPicks).length;

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Resumo do Bracket</h2>
        {isSubmitted ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent text-sm font-medium">
            <Target className="h-4 w-4" />
            Bracket enviado!
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isComplete ? 'Tudo pronto para enviar!' : 'Complete todas as escolhas para enviar.'}
          </p>
        )}
      </div>

      {/* Champion highlight */}
      {champion && (
        <div className="rounded-2xl border-2 border-primary bg-primary/5 p-8 text-center space-y-3">
          <Trophy className="h-10 w-10 text-primary mx-auto" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Seu Campeão</p>
            <p className="text-4xl mt-2">{findFlag(champion, groups)}</p>
            <p className="text-xl font-bold mt-1">{champion}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{groupsComplete}/12</p>
          <p className="text-xs text-muted-foreground mt-1">Grupos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-accent">{thirdsComplete}/8</p>
          <p className="text-xs text-muted-foreground mt-1">Terceiros</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{knockoutComplete}/31</p>
          <p className="text-xs text-muted-foreground mt-1">Mata-mata</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {!isSubmitted && (
          <Button
            onClick={onSubmit}
            disabled={!isComplete}
            className="flex-1 gradient-primary border-0 h-12 text-base font-bold"
            size="lg"
          >
            <Send className="h-5 w-5 mr-2" />
            Enviar Bracket
          </Button>
        )}

        <Button
          variant="outline"
          onClick={onReset}
          className="flex-1"
          size="lg"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Resetar
        </Button>
      </div>
    </div>
  );
}
