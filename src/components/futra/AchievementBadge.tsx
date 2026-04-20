import { icons } from '@/lib/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AchievementBadgeProps {
  name: string;
  description: string;
  icon: string;
  rarity: string;
  unlocked: boolean;
  unlockedAt?: string;
  size?: 'sm' | 'md';
}

const rarityStyles: Record<string, string> = {
  common: 'border-border',
  rare: 'border-primary/40 ring-1 ring-primary/20',
  epic: 'border-emerald/40 ring-1 ring-emerald/20',
  legendary: 'border-amber-400/40 ring-1 ring-amber-400/20',
};

const rarityLabel: Record<string, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};

export function AchievementBadge({ name, description, icon, rarity, unlocked, unlockedAt, size = 'md' }: AchievementBadgeProps) {
  const iconKey = icon as keyof typeof icons;
  const LucideIcon = icons[iconKey] || icons['Award'];
  const dim = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'rounded-lg border bg-card flex items-center justify-center transition-all',
              dim,
              unlocked ? rarityStyles[rarity] || rarityStyles.common : 'border-border opacity-30 grayscale'
            )}
          >
            <LucideIcon size={iconSize} className={cn('text-muted-foreground', unlocked && 'text-foreground')} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-center">
          <p className="font-medium text-xs">{name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {unlocked
              ? `Desbloqueado em ${new Date(unlockedAt!).toLocaleDateString('pt-BR')}`
              : `${rarityLabel[rarity] || 'Comum'} · Bloqueado`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
