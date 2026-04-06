import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Coins } from 'lucide-react';
import { MarketCardData } from '@/types';
import { fetchMarketById } from '@/lib/market-queries';
import { CategoryBadge } from './CategoryBadge';
import { StatusBadge } from './StatusBadge';
import { CountdownTimer } from './CountdownTimer';
import { VoteBar } from './VoteBar';
import { ShareButton } from './ShareButton';
import { cn } from '@/lib/utils';

interface MarketCardProps {
  market: MarketCardData;
  className?: string;
  featured?: boolean;
}

function formatNumber(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export function MarketCard({ market, className, featured }: MarketCardProps) {
  const queryClient = useQueryClient();
  const leader = [...market.options].sort((a, b) => b.percentage - a.percentage)[0];

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['market', market.id],
      queryFn: () => fetchMarketById(market.id),
      staleTime: 60_000,
    });
  };
  const shareUrl = `${window.location.origin}/market/${market.id}`;
  const shareText = leader
    ? `"${market.question}" — ${leader.percentage}% say ${leader.label} | @fuabordo`
    : market.question;

  return (
    <Link
      to={`/market/${market.id}`}
      onMouseEnter={handleMouseEnter}
      className={cn(
        'group block rounded-xl glass-card p-4 sm:p-5 transition-all duration-200 active:scale-[0.98]',
        'hover:translate-y-[-2px] hover:shadow-lg',
        featured && 'gradient-border',
        className
      )}
    >
      {/* Top row: category + status + leader percentage */}
      <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <CategoryBadge category={market.category} />
          <StatusBadge status={market.status} />
        </div>
        <span className={cn(
          'font-display text-2xl font-bold shrink-0',
          leader.label.toLowerCase() === 'yes' || leader.label.toLowerCase() === 'sim'
            ? 'text-emerald glow-text-emerald'
            : 'text-neon-blue glow-text'
        )}>
          {leader.percentage}%
        </span>
      </div>

      <h3 className="font-display font-semibold text-foreground leading-snug mb-2 line-clamp-2 text-sm sm:text-base">
        {market.question}
      </h3>

      <VoteBar options={market.options} type={market.type as 'binary' | 'multiple'} compact />

      <div className="flex items-center justify-between mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-border/50">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {formatNumber(market.totalParticipants)}
          </span>
          <span className="flex items-center gap-1">
            <Coins className="h-3.5 w-3.5" />
            {formatNumber(market.totalCredits)}
          </span>
          <CountdownTimer endDate={market.endDate} />
        </div>
        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <ShareButton title={market.question} text={shareText} url={shareUrl} />
        </div>
      </div>
    </Link>
  );
}
