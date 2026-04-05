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
      className="flex items-center gap-4 p-4 rounded-lg hover:bg-surface-700 transition-colors"
    >
      <span className={cn(
        'w-8 text-center font-display font-bold text-lg',
        rank <= 3 ? 'text-emerald' : 'text-muted-foreground'
      )}>
        {rank}
      </span>

      <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-sm font-bold text-primary">
        {user.displayName.charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground truncate">{user.displayName}</span>
          <InfluenceBadge level={user.influenceLevel} />
        </div>
        <span className="text-xs text-muted-foreground">@{user.username}</span>
      </div>

      <div className="text-right">
        <p className="font-display font-bold text-foreground">{user.futraScore}</p>
        <p className="text-xs text-muted-foreground">{user.accuracyRate}% accuracy</p>
      </div>
    </Link>
  );
}
