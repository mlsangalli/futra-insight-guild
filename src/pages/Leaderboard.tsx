import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useLeaderboard } from '@/hooks/useMarkets';
import { InfluenceBadge } from '@/components/futra/InfluenceBadge';
import { CATEGORIES } from '@/data/types';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Loader2, Trophy } from 'lucide-react';

const TIME_FILTERS = ['All Time', 'This Week', 'This Month'];

export default function LeaderboardPage() {
  const [timeFilter, setTimeFilter] = useState('All Time');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { data: users, isLoading } = useLeaderboard();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Leaderboard</h1>
        <p className="text-muted-foreground mb-6">Top forecasters ranked by Futra Score and accuracy.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {TIME_FILTERS.map(f => (
            <button key={f} onClick={() => setTimeFilter(f)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', timeFilter === f ? 'bg-surface-700 text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          <button onClick={() => setCategoryFilter('all')} className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors', categoryFilter === 'all' ? 'bg-primary/10 text-primary' : 'bg-surface-700 text-muted-foreground')}>All</button>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setCategoryFilter(cat.key)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors', categoryFilter === cat.key ? 'bg-primary/10 text-primary' : 'bg-surface-700 text-muted-foreground')}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
        ) : !users?.length ? (
          <div className="text-center py-20"><p className="text-muted-foreground">No forecasters yet. Be the first!</p></div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {users.map((user: any, i: number) => (
              <Link key={user.id} to={`/profile/${user.username}`} className="flex items-center gap-3 sm:gap-4 p-4 hover:bg-surface-800 transition-colors">
                <span className={cn('font-display font-bold text-lg w-8 text-center shrink-0', i < 3 ? 'text-primary' : 'text-muted-foreground')}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">
                  {user.display_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{user.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{user.username} · {user.accuracy_rate}% accuracy</p>
                </div>
                <div className="hidden sm:block"><InfluenceBadge level={user.influence_level} /></div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-foreground">{user.futra_score}</p>
                  <p className="text-xs text-muted-foreground">score</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
