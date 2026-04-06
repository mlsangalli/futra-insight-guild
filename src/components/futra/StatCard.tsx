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
    <div className={cn('rounded-xl glass-card gradient-border p-3 sm:p-5', className)}>
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider truncate">{label}</span>
        {Icon && <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-neon-blue shrink-0" />}
      </div>
      <p className="text-lg sm:text-2xl font-display font-bold text-foreground glow-text truncate">{value}</p>
      {change && (
        <p className={cn('text-[10px] sm:text-xs mt-1 font-medium', change.startsWith('+') ? 'text-emerald' : 'text-negative')}>
          {change}
        </p>
      )}
    </div>
  );
}
