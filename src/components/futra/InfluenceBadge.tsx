import { InfluenceLevel, INFLUENCE_LABELS } from '@/types';
import { cn } from '@/lib/utils';

interface InfluenceBadgeProps {
  level: InfluenceLevel;
  className?: string;
}

const levelStyles: Record<InfluenceLevel, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-emerald/10 text-emerald',
  elite: 'gradient-primary text-primary-foreground',
};

export function InfluenceBadge({ level, className }: InfluenceBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
      levelStyles[level],
      className
    )}>
      {level === 'elite' && '💎 '}{INFLUENCE_LABELS[level]}
    </span>
  );
}
