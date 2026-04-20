import { cn } from '@/lib/utils';
import { LucideIcon } from '@/lib/icons';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  change?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, change, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl glass-card p-5', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider truncate">{label}</span>
        {Icon && (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-neon-blue" />
          </div>
        )}
      </div>
      <p className="text-2xl font-display font-bold text-foreground glow-text truncate animate-count-up">{value}</p>
      {change && (
        <p className={cn('text-xs mt-1 font-medium', change.startsWith('+') ? 'text-emerald' : 'text-negative')}>
          {change}
        </p>
      )}
    </div>
  );
}
