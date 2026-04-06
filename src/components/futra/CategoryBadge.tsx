import { MarketCategory, CATEGORIES } from '@/types';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: MarketCategory;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const cat = CATEGORIES.find(c => c.key === category);
  if (!cat) return null;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
      'bg-surface-700 text-secondary-foreground',
      className
    )}>
      <span>{cat.emoji}</span>
      <span>{cat.label}</span>
    </span>
  );
}
