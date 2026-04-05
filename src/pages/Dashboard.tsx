import { Layout } from '@/components/layout/Layout';
import { StatCard } from '@/components/futra/StatCard';
import { InfluenceBadge } from '@/components/futra/InfluenceBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPredictions } from '@/hooks/useMarkets';
import { Trophy, Coins, Target, TrendingUp, Bookmark, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

const TABS = ['Open', 'Resolved', 'Watchlist'];

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { data: predictions } = useUserPredictions(user?.id);
  const [tab, setTab] = useState('Open');

  if (loading) return <Layout><div className="container mx-auto px-4 py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div></Layout>;
  if (!user) return <Navigate to="/login" />;

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
          {profile && <InfluenceBadge level={profile.influence_level} />}
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
            {openPredictions.length === 0 ? (
              <div className="text-center py-16"><p className="text-muted-foreground">No open predictions. <Link to="/browse" className="text-primary hover:underline">Browse markets</Link></p></div>
            ) : openPredictions.map((p: any) => (
              <Link key={p.id} to={`/market/${p.market_id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                <p className="text-sm font-medium text-foreground">{p.markets?.question || 'Market'}</p>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Pick: <span className="text-primary">{p.selected_option}</span></span>
                  <span>Credits: <span className="text-foreground">{p.credits_allocated} FC</span></span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {tab === 'Resolved' && (
          <div className="space-y-3">
            {resolvedPredictions.length === 0 ? (
              <div className="text-center py-16"><p className="text-muted-foreground">No resolved predictions yet.</p></div>
            ) : resolvedPredictions.map((p: any) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground">{p.markets?.question || 'Market'}</p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className={p.status === 'won' ? 'text-emerald' : 'text-negative'}>{p.status === 'won' ? 'Won' : 'Lost'}</span>
                  <span className="text-muted-foreground">{p.credits_allocated} FC risked</span>
                  {p.reward > 0 && <span className="text-emerald">+{p.reward} FC</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Watchlist' && (
          <div className="text-center py-16">
            <Bookmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No saved markets yet.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
