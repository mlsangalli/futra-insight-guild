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
    <div className={cn('rounded-xl glass-card gradient-border p-5', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-neon-blue" />}
      </div>
      <p className="text-2xl font-display font-bold text-foreground glow-text">{value}</p>
      {change && (
        <p className={cn('text-xs mt-1 font-medium', change.startsWith('+') ? 'text-emerald' : 'text-negative')}>
          {change}
        </p>
      )}
    </div>
  );
}
