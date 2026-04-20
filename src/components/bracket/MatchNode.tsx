import { cn } from '@/lib/utils';
import type { BracketMatch } from '@/types/bracket';
import { Lock, Trophy } from '@/lib/icons';

interface MatchNodeProps {
  match: BracketMatch;
  homeTeam: string | null;
  awayTeam: string | null;
  homeFlag?: string;
  awayFlag?: string;
  chosenWinner: string | null;
  onPickWinner: (teamName: string) => void;
  disabled?: boolean;
  isFinal?: boolean;
}

export function MatchNode({
  match, homeTeam, awayTeam, homeFlag, awayFlag,
  chosenWinner, onPickWinner, disabled, isFinal
}: MatchNodeProps) {
  const isLocked = match.is_locked || disabled;
  const bothAvailable = !!homeTeam && !!awayTeam;

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200 overflow-hidden w-52 shrink-0',
      isFinal ? 'border-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.15)]' : 'border-border',
      bothAvailable && !isLocked && 'hover:border-primary/30',
    )}>
      {isFinal && (
        <div className="px-3 py-1.5 bg-primary/10 text-center">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Final</span>
        </div>
      )}

      {/* Home team */}
      <button
        type="button"
        onClick={() => homeTeam && !isLocked && onPickWinner(homeTeam)}
        disabled={!homeTeam || isLocked}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2.5 text-left transition-all',
          chosenWinner === homeTeam
            ? 'bg-primary/15 text-primary font-semibold'
            : 'text-foreground hover:bg-secondary/50',
          (!homeTeam || isLocked) && 'opacity-50 cursor-not-allowed',
        )}
      >
        {homeFlag && <span className="text-sm">{homeFlag}</span>}
        <span className="text-xs flex-1 truncate">{homeTeam || '—'}</span>
        {chosenWinner === homeTeam && <Trophy className="h-3 w-3 text-primary" />}
      </button>

      <div className="border-t border-border/50" />

      {/* Away team */}
      <button
        type="button"
        onClick={() => awayTeam && !isLocked && onPickWinner(awayTeam)}
        disabled={!awayTeam || isLocked}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2.5 text-left transition-all',
          chosenWinner === awayTeam
            ? 'bg-primary/15 text-primary font-semibold'
            : 'text-foreground hover:bg-secondary/50',
          (!awayTeam || isLocked) && 'opacity-50 cursor-not-allowed',
        )}
      >
        {awayFlag && <span className="text-sm">{awayFlag}</span>}
        <span className="text-xs flex-1 truncate">{awayTeam || '—'}</span>
        {chosenWinner === awayTeam && <Trophy className="h-3 w-3 text-primary" />}
      </button>

      {isLocked && (
        <div className="px-3 py-1 bg-muted/50 flex items-center justify-center gap-1">
          <Lock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Bloqueado</span>
        </div>
      )}
    </div>
  );
}
