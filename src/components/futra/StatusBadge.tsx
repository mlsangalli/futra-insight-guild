import { cn } from '@/lib/utils';

type MarketStatusType = 'open' | 'closed' | 'resolved';
type PredictionStatusType = 'pending' | 'won' | 'lost';

interface StatusBadgeProps {
  status: MarketStatusType | PredictionStatusType;
  className?: string;
}

const config: Record<string, { label: string; className: string; dot?: boolean }> = {
  open: { label: 'Live', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: true },
  closed: { label: 'Closed', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  resolved: { label: 'Resolved', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  pending: { label: 'Pending', className: 'bg-muted text-muted-foreground border-border' },
  won: { label: 'Won', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  lost: { label: 'Lost', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const c = config[status];
  if (!c) return null;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border',
      c.className, className
    )}>
      {c.dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {c.label}
    </span>
  );
}
