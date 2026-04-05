import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  change?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, change, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 card-hover', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground/60" />}
      </div>
      <p className="text-3xl stat-number text-foreground">{value}</p>
      {change && (
        <p className={cn('text-xs mt-1.5 font-medium', change.startsWith('+') ? 'text-emerald' : 'text-negative')}>
          {change}
        </p>
      )}
    </div>
  );
}
