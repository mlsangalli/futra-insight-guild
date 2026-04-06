import { Link } from 'react-router-dom';
import { Clock, Users, Coins } from 'lucide-react';
import { Market } from '@/data/types';
import { CategoryBadge } from './CategoryBadge';
import { VoteBar } from './VoteBar';
import { cn } from '@/lib/utils';

interface MarketCardProps {
  market: Market;
  className?: string;
  featured?: boolean;
}

function timeRemaining(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months}mo left`;
  }
  return `${days}d left`;
}

function formatNumber(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export function MarketCard({ market, className, featured }: MarketCardProps) {
  const leader = [...market.options].sort((a, b) => b.percentage - a.percentage)[0];

  return (
    <Link
      to={`/market/${market.id}`}
      className={cn(
        'block rounded-xl glass-card p-4 sm:p-5 transition-all duration-300 active:scale-[0.98]',
        featured && 'gradient-border',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
        <CategoryBadge category={market.category} />
        <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground shrink-0">
          <Clock className="h-3 w-3" />
          {timeRemaining(market.endDate)}
        </span>
      </div>

      <h3 className="font-display font-semibold text-foreground leading-snug mb-2 line-clamp-2 text-sm sm:text-base">
        {market.question}
      </h3>

      {/* Big leader percentage */}
      <div className="mb-2 sm:mb-3 flex items-baseline gap-1.5">
        <span className={cn(
          'font-display text-xl sm:text-2xl font-bold',
          leader.label.toLowerCase() === 'yes' || leader.label.toLowerCase() === 'sim'
            ? 'text-emerald glow-text-emerald'
            : 'text-neon-blue glow-text'
        )}>
          {leader.percentage}%
        </span>
        <span className="text-[10px] sm:text-xs text-muted-foreground">{leader.label}</span>
      </div>

      <VoteBar options={market.options} type={market.type} compact />

      <div className="flex items-center justify-between mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-border/50">
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {formatNumber(market.totalParticipants)}
          </span>
          <span className="flex items-center gap-1">
            <Coins className="h-3 w-3" />
            {formatNumber(market.totalCredits)}
          </span>
        </div>
      </div>
    </Link>
  );
}
