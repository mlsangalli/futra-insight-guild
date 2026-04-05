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
          <span className="font-medium text-emerald">{yes.label} {yes.percentage}%</span>
          <span className="font-medium text-negative">{no.label} {no.percentage}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden flex">
          <div
            className="h-full bg-emerald rounded-l-full transition-all duration-500"
            style={{ width: `${yes.percentage}%` }}
          />
          <div
            className="h-full bg-negative rounded-r-full transition-all duration-500"
            style={{ width: `${no.percentage}%` }}
          />
        </div>
      </div>
    );
  }

  const sorted = [...options].sort((a, b) => b.percentage - a.percentage);
  const leader = sorted[0];

  return (
    <div className="space-y-1.5">
      {(compact ? sorted.slice(0, 3) : sorted).map((opt, i) => (
        <div key={opt.id} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className={cn('font-medium', i === 0 ? 'text-emerald' : 'text-secondary-foreground')}>
              {opt.label}
            </span>
            <span className="text-muted-foreground">{opt.percentage}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                i === 0 ? 'bg-emerald' : 'bg-primary/40'
              )}
              style={{ width: `${opt.percentage}%` }}
            />
          </div>
        </div>
      ))}
      {compact && sorted.length > 3 && (
        <p className="text-xs text-muted-foreground">+{sorted.length - 3} more options</p>
      )}
    </div>
  );
}
