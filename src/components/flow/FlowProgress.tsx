import { Coins, Zap } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { FlowCombo } from './FlowCombo';

interface FlowProgressProps {
  answered: number;
  skipped: number;
  invested: number;
  remaining: number;
  streak: number;
  className?: string;
}

export function FlowProgress({ answered, skipped, invested, remaining, streak, className }: FlowProgressProps) {
  const total = answered + skipped + remaining;
  const pct = total > 0 ? Math.round(((answered + skipped) / total) * 100) : 0;

  return (
    <div className={cn('w-full max-w-md mx-auto px-4 pt-2 pb-1.5', className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
          <Zap className="h-3 w-3 text-primary" />
          <span className="tabular-nums">{answered}</span>
          <span className="hidden xs:inline">· {invested.toLocaleString('pt-BR')} FC</span>
        </span>
        <FlowCombo streak={streak} />
        <span className="inline-flex items-center gap-1 text-muted-foreground sm:hidden">
          <Coins className="h-3 w-3 text-warning" />
          <span className="tabular-nums">{invested.toLocaleString('pt-BR')}</span>
        </span>
      </div>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-surface-700">
        <div
          className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
