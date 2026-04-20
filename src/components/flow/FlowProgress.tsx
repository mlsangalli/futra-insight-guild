import { Coins, Flame, Zap } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface FlowProgressProps {
  answered: number;
  skipped: number;
  invested: number;
  remaining: number;
  className?: string;
}

export function FlowProgress({ answered, skipped, invested, remaining, className }: FlowProgressProps) {
  const total = answered + skipped + remaining;
  const pct = total > 0 ? Math.round(((answered + skipped) / total) * 100) : 0;

  return (
    <div className={cn('w-full max-w-md mx-auto px-4 pt-3 pb-2', className)}>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" /> {answered} respondidos
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Coins className="h-3.5 w-3.5 text-warning" /> {invested.toLocaleString('pt-BR')} FC
        </span>
        {answered >= 5 && (
          <span className="inline-flex items-center gap-1 text-warning">
            <Flame className="h-3.5 w-3.5" /> Em chamas
          </span>
        )}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-700">
        <div
          className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
