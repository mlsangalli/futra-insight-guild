import { cn } from '@/lib/utils';
import { MarketOption } from '@/types';

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
          <span className="font-display font-bold text-emerald">{yes.label} {yes.percentage}%</span>
          <span className="font-display font-bold text-negative">{no.label} {no.percentage}%</span>
        </div>
        <div className="h-3 rounded-md bg-muted/50 overflow-hidden flex">
          <div
            className="h-full bg-emerald rounded-l-md transition-all duration-500 bar-glow-emerald"
            style={{ width: `${yes.percentage}%` }}
          />
          <div
            className="h-full bg-negative rounded-r-md transition-all duration-500"
            style={{ width: `${no.percentage}%` }}
          />
        </div>
      </div>
    );
  }

  const sorted = [...options].sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="space-y-0">
      {(compact ? sorted.slice(0, 3) : sorted).map((opt, i) => (
        <div
          key={opt.id}
          className={cn(
            'relative py-2.5 px-3 overflow-hidden',
            i < (compact ? Math.min(sorted.length, 3) : sorted.length) - 1 && 'border-b border-border/20'
          )}
        >
          {/* Background fill bar */}
          <div
            className={cn(
              'absolute inset-0 transition-all duration-500',
              i === 0 ? 'bg-emerald/15' : 'bg-primary/8'
            )}
            style={{ width: `${opt.percentage}%` }}
          />
          <div className="relative flex justify-between items-center">
            <span className={cn(
              'text-sm font-medium',
              i === 0 ? 'text-emerald' : 'text-secondary-foreground'
            )}>
              {opt.label}
            </span>
            <span className={cn(
              'font-display font-bold text-base',
              i === 0 ? 'text-emerald' : 'text-muted-foreground'
            )}>
              {opt.percentage}%
            </span>
          </div>
        </div>
      ))}
      {compact && sorted.length > 3 && (
        <p className="text-xs text-muted-foreground px-3 py-1.5">+{sorted.length - 3} opções</p>
      )}
    </div>
  );
}
