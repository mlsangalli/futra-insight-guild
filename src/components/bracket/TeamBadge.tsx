import { cn } from '@/lib/utils';

interface TeamBadgeProps {
  flag: string;
  name: string;
  code?: string;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function TeamBadge({ flag, name, code, size = 'md', selected, onClick, className }: TeamBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs gap-1 px-2 py-1',
    md: 'text-sm gap-1.5 px-3 py-1.5',
    lg: 'text-base gap-2 px-4 py-2',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'inline-flex items-center rounded-lg border transition-all duration-200 font-medium',
        sizeClasses[size],
        selected
          ? 'border-primary bg-primary/15 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.2)]'
          : 'border-border bg-card text-foreground hover:border-primary/50',
        !onClick && 'cursor-default',
        className
      )}
    >
      <span className={cn(size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base')}>{flag}</span>
      <span className="truncate">{name}</span>
      {code && <span className="text-muted-foreground text-[10px] font-mono">{code}</span>}
    </button>
  );
}
