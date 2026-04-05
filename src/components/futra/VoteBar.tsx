import { cn } from '@/lib/utils';
import { MarketOption } from '@/data/types';

interface VoteBarProps {
  options: MarketOption[];
  type: 'binary' | 'multiple';
  compact?: boolean;
}

export function VoteBar({ options, type, compact }: VoteBarProps) {
  if (type === 'binary') {
    const yes = options[0];
    const no = options[1];
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-emerald">{yes.label} <span className="stat-emerald text-emerald">{yes.percentage}%</span></span>
          <span className="font-medium text-negative">{no.label} <span className="font-display font-bold">{no.percentage}%</span></span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden flex">
          <div
            className="h-full bg-emerald/80 rounded-l-full transition-all duration-700 ease-out"
            style={{ width: `${yes.percentage}%` }}
          />
          <div
            className="h-full bg-negative/60 rounded-r-full transition-all duration-700 ease-out"
            style={{ width: `${no.percentage}%` }}
          />
        </div>
      </div>
    );
  }

  const sorted = [...options].sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="space-y-1.5">
      {(compact ? sorted.slice(0, 3) : sorted).map((opt, i) => (
        <div key={opt.id} className="space-y-0.5">
          <div className="flex justify-between text-xs">
            <span className={cn('font-medium', i === 0 ? 'text-emerald' : 'text-secondary-foreground')}>
              {opt.label}
            </span>
            <span className={cn('font-display font-bold', i === 0 ? 'text-emerald' : 'text-muted-foreground')}>
              {opt.percentage}%
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                i === 0 ? 'bg-emerald/70' : 'bg-primary/25'
              )}
              style={{ width: `${opt.percentage}%` }}
            />
          </div>
        </div>
      ))}
      {compact && sorted.length > 3 && (
        <p className="text-xs text-muted-foreground">+{sorted.length - 3} more</p>
      )}
    </div>
  );
}
