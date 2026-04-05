import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { InfluenceBadge } from '@/components/futra/InfluenceBadge';
import { CategoryBadge } from '@/components/futra/CategoryBadge';
import { StatCard } from '@/components/futra/StatCard';
import { useProfile } from '@/hooks/useMarkets';
import { Target, Coins, Trophy, Zap, Loader2 } from 'lucide-react';
import { MarketCategory } from '@/data/types';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { data: user, isLoading } = useProfile(username || '');

  if (isLoading) return <Layout><div className="container mx-auto px-4 py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div></Layout>;

  if (!user) {
    return <Layout><div className="container mx-auto px-4 py-20 text-center"><p className="text-muted-foreground">User not found.</p></div></Layout>;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-xl border border-border bg-card p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shrink-0">
              {user.display_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-2xl font-bold text-foreground">{user.display_name}</h1>
                <InfluenceBadge level={user.influence_level} />
              </div>
              <p className="text-muted-foreground text-sm">@{user.username}</p>
              <p className="text-secondary-foreground mt-2">{user.bio}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {(user.specialties || []).map((s: string) => (
                  <CategoryBadge key={s} category={s as MarketCategory} />
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Global Rank</p>
              <p className="font-display text-3xl font-bold text-foreground">#{user.global_rank || '—'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <StatCard label="Futra Score" value={user.futra_score} icon={Trophy} />
          <StatCard label="Futra Credits" value={(user.futra_credits || 0).toLocaleString()} icon={Coins} />
          <StatCard label="Accuracy" value={`${user.accuracy_rate}%`} icon={Target} />
          <StatCard label="Streak" value={user.streak} icon={Zap} />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground mb-4">Prediction history</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total predictions</span><span className="text-foreground font-medium">{user.total_predictions}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Resolved</span><span className="text-foreground font-medium">{user.resolved_predictions}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pending</span><span className="text-foreground font-medium">{user.total_predictions - user.resolved_predictions}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Win rate</span><span className="text-emerald font-medium">{user.accuracy_rate}%</span></div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground mb-4">About</h2>
            <p className="text-sm text-muted-foreground">{user.bio || 'No bio yet.'}</p>
            <p className="text-xs text-muted-foreground mt-4">Joined {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
