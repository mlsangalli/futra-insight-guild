import { Link } from 'react-router-dom';
import { User } from '@/data/types';
import { InfluenceBadge } from './InfluenceBadge';

interface ProfileCardProps {
  user: User;
}

export function ProfileCard({ user }: ProfileCardProps) {
  return (
    <Link
      to={`/profile/${user.username}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-700 transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-sm font-bold text-primary shrink-0">
        {user.displayName.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground text-sm truncate">{user.displayName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>#{user.globalRank}</span>
          <span>·</span>
          <span>{user.accuracyRate}%</span>
        </div>
      </div>
      <InfluenceBadge level={user.influenceLevel} />
    </Link>
  );
}
