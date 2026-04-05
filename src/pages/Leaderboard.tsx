import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { LeaderboardRow } from '@/components/futra/LeaderboardRow';
import { mockUsers } from '@/data/mock-users';
import { CATEGORIES } from '@/data/types';
import { cn } from '@/lib/utils';

const TIME_FILTERS = ['All Time', 'This Week', 'This Month'];

export default function LeaderboardPage() {
  const [timeFilter, setTimeFilter] = useState('All Time');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const sorted = [...mockUsers].sort((a, b) => a.globalRank - b.globalRank);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Leaderboard</h1>
        <p className="text-muted-foreground mb-6">Top forecasters ranked by Futra Score and accuracy.</p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {TIME_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                timeFilter === f ? 'bg-surface-700 text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              categoryFilter === 'all' ? 'bg-primary/10 text-primary' : 'bg-surface-700 text-muted-foreground'
            )}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                categoryFilter === cat.key ? 'bg-primary/10 text-primary' : 'bg-surface-700 text-muted-foreground'
              )}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {sorted.map((user, i) => (
            <LeaderboardRow key={user.id} user={user} rank={i + 1} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
