import { Link } from 'react-router-dom';
import { User } from '@/data/types';
import { InfluenceBadge } from './InfluenceBadge';
import { cn } from '@/lib/utils';

interface LeaderboardRowProps {
  user: User;
  rank: number;
}

export function LeaderboardRow({ user, rank }: LeaderboardRowProps) {
  return (
    <Link
      to={`/profile/${user.username}`}
      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg hover:bg-surface-700 transition-colors"
    >
      <span className={cn(
        'w-6 sm:w-8 text-center font-display font-bold text-base sm:text-lg shrink-0',
        rank <= 3 ? 'text-emerald' : 'text-muted-foreground'
      )}>
        {rank}
      </span>

      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface-700 flex items-center justify-center text-xs sm:text-sm font-bold text-primary shrink-0">
        {user.displayName.charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="font-semibold text-foreground text-sm sm:text-base">{user.displayName}</span>
          <InfluenceBadge level={user.influenceLevel} className="hidden sm:inline-flex" />
        </div>
        <span className="text-xs text-muted-foreground">@{user.username}</span>
      </div>

      <div className="text-right shrink-0">
        <p className="font-display font-bold text-foreground text-sm sm:text-base">{user.futraScore}</p>
        <p className="text-xs text-muted-foreground">{user.accuracyRate}%</p>
      </div>
    </Link>
  );
}
