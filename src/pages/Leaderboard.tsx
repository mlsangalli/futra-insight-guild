import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useLeaderboard } from '@/hooks/useMarkets';
import { InfluenceBadge } from '@/components/futra/InfluenceBadge';
import { CATEGORIES } from '@/types';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { LeaderboardSkeleton, ErrorState, EmptyState } from '@/components/futra/Skeletons';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';

const TIME_FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'Esta semana', value: 'week' },
  { label: 'Este mês', value: 'month' },
];

export default function LeaderboardPage() {
  const [timeFilter, setTimeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { data: users, isLoading, isError, refetch } = useLeaderboard({
    period: timeFilter,
    category: categoryFilter,
  });

  return (
    <Layout>
      <SEO title="Ranking" description="Melhores previsores ranqueados por Futra Score e precisão" />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Ranking</h1>
        <p className="text-muted-foreground mb-6">Melhores previsores ranqueados por Futra Score e precisão.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {TIME_FILTERS.map(f => (
            <button key={f.value} onClick={() => setTimeFilter(f.value)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', timeFilter === f.value ? 'bg-surface-700 text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          <button onClick={() => setCategoryFilter('all')} className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors', categoryFilter === 'all' ? 'bg-primary/10 text-primary' : 'bg-surface-700 text-muted-foreground')}>Todos</button>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setCategoryFilter(cat.key)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors', categoryFilter === cat.key ? 'bg-primary/10 text-primary' : 'bg-surface-700 text-muted-foreground')}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <LeaderboardSkeleton count={10} />
        ) : !users?.length ? (
          <EmptyState
            icon={<Trophy className="h-10 w-10 text-muted-foreground" />}
            title="Nenhum previsor ainda"
            description="Seja o primeiro a fazer previsões e aparecer no ranking!"
            action={<Button variant="outline" asChild><Link to="/browse">Explorar mercados</Link></Button>}
          />
        ) : (
          <div className="space-y-6">
            {/* Top 3 highlight cards */}
            {users.length >= 3 && (
              <div className="grid sm:grid-cols-3 gap-4">
                {users.slice(0, 3).map((user: any, i: number) => (
                  <Link
                    key={user.id}
                    to={`/profile/${user.username}`}
                    className={cn(
                      'glass-card gradient-border rounded-xl p-5 text-center transition-all hover:scale-[1.02]',
                      i === 0 && 'sm:order-2'
                    )}
                  >
                    <div className={cn(
                      'w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-lg font-bold',
                      i === 0
                        ? 'gradient-primary text-primary-foreground ring-2 ring-yellow-400/60 glow-emerald'
                        : 'bg-surface-700 text-foreground'
                    )}>
                      {user.display_name?.charAt(0) || '?'}
                    </div>
                    <p className="text-2xl mb-1">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</p>
                    <p className="font-medium text-foreground text-sm truncate">{user.display_name}</p>
                    <p className="text-xs text-muted-foreground mb-2">@{user.username}</p>
                    <p className={cn(
                      'font-display text-2xl font-bold',
                      i === 0 ? 'text-foreground glow-text' : 'text-foreground'
                    )}>
                      {user.futra_score}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.accuracy_rate}% precisão</p>
                  </Link>
                ))}
              </div>
            )}

            {/* Remaining rows */}
            <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
              {users.slice(3).map((user: any, i: number) => (
                <Link
                  key={user.id}
                  to={`/profile/${user.username}`}
                  className={cn(
                    'flex items-center gap-3 sm:gap-4 p-4 transition-colors hover:bg-surface-800/50',
                    i % 2 === 1 && 'bg-surface-800/30'
                  )}
                >
                  <span className="font-display font-bold text-lg w-8 text-center shrink-0 text-muted-foreground">
                    #{i + 4}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-sm font-bold text-foreground shrink-0">
                    {user.display_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{user.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{user.username} · {user.accuracy_rate}% precisão</p>
                  </div>
                  <div className="hidden sm:block"><InfluenceBadge level={user.influence_level} /></div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-foreground">{user.futra_score}</p>
                    <p className="text-xs text-muted-foreground">score</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
