import { Layout } from '@/components/layout/Layout';
import { StatCard } from '@/components/futra/StatCard';
import { StatusBadge } from '@/components/futra/StatusBadge';
import { InfluenceBadge } from '@/components/futra/InfluenceBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPredictions } from '@/hooks/useMarkets';
import { Trophy, Coins, Target, TrendingUp, Bookmark, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatCardSkeleton, PredictionRowSkeleton, EmptyState } from '@/components/futra/Skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import EditProfileDialog from '@/components/EditProfileDialog';
import { DailyBonusBanner } from '@/components/futra/DailyBonusBanner';
import { ReferralCard } from '@/components/futra/ReferralCard';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';

const TABS = ['Open', 'Resolved', 'Saved'];

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { data: predictions, isLoading: loadingPredictions } = useUserPredictions(user?.id);
  const [tab, setTab] = useState('Open');

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <PredictionRowSkeleton key={i} />)}
          </div>
        </div>
      </Layout>
    );
  }

  const openPredictions = predictions?.filter((p: any) => p.status === 'pending') || [];
  const resolvedPredictions = predictions?.filter((p: any) => p.status !== 'pending') || [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {profile?.display_name || profile?.username}</p>
          </div>
          <div className="flex items-center gap-3">
            <EditProfileDialog />
            {profile && <InfluenceBadge level={profile.influence_level} />}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Futra Credits" value={(profile?.futra_credits || 0).toLocaleString()} icon={Coins} />
          <StatCard label="Futra Score" value={profile?.futra_score || 0} icon={Trophy} />
          <StatCard label="Accuracy" value={`${profile?.accuracy_rate || 0}%`} icon={Target} />
          <StatCard label="Global Rank" value={profile?.global_rank ? `#${profile.global_rank}` : '—'} icon={TrendingUp} />
        </div>

        <div className="flex gap-1 mb-6 border-b border-border">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px', tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'Open' && (
          <div className="space-y-3">
            {loadingPredictions ? (
              Array.from({ length: 3 }).map((_, i) => <PredictionRowSkeleton key={i} />)
            ) : openPredictions.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="h-10 w-10 text-muted-foreground" />}
                title="No open predictions"
                description="Explore markets and make your first prediction!"
                action={<Button variant="outline" asChild><Link to="/browse">Explore markets</Link></Button>}
              />
            ) : openPredictions.map((p: any) => (
              <Link key={p.id} to={`/market/${p.market_id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{p.markets?.question || 'Market'}</p>
                  <StatusBadge status="pending" />
                </div>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Choice: <span className="text-primary">{p.selected_option}</span></span>
                  <span>Credits: <span className="text-foreground">{p.credits_allocated} FC</span></span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {tab === 'Resolved' && (
          <div className="space-y-3">
            {loadingPredictions ? (
              Array.from({ length: 3 }).map((_, i) => <PredictionRowSkeleton key={i} />)
            ) : resolvedPredictions.length === 0 ? (
              <EmptyState
                icon={<Target className="h-10 w-10 text-muted-foreground" />}
                title="No resolved predictions"
                description="Your resolved predictions will appear here."
              />
            ) : resolvedPredictions.map((p: any) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{p.markets?.question || 'Market'}</p>
                  <StatusBadge status={p.status} />
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-muted-foreground">{p.credits_allocated} FC staked</span>
                  {p.reward > 0 && <span className="text-emerald">+{p.reward} FC</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Saved' && (
          <EmptyState
            icon={<Bookmark className="h-10 w-10 text-muted-foreground" />}
            title="No saved markets"
            description="Save markets to track them here."
          />
        )}
      </div>
    </Layout>
  );
}
