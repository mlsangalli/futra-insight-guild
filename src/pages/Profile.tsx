import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { InfluenceBadge } from '@/components/futra/InfluenceBadge';
import { CategoryBadge } from '@/components/futra/CategoryBadge';
import { StatCard } from '@/components/futra/StatCard';
import { mockUsers } from '@/data/mock-users';
import { Target, Coins, Trophy, TrendingUp, Zap } from 'lucide-react';
import { MarketCategory } from '@/data/types';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const user = mockUsers.find(u => u.username === username);

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">User not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="rounded-xl border border-border bg-card p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shrink-0">
              {user.displayName.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-2xl font-bold text-foreground">{user.displayName}</h1>
                <InfluenceBadge level={user.influenceLevel} />
              </div>
              <p className="text-muted-foreground text-sm">@{user.username}</p>
              <p className="text-secondary-foreground mt-2">{user.bio}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {user.specialties.map(s => (
                  <CategoryBadge key={s} category={s as MarketCategory} />
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Global Rank</p>
              <p className="font-display text-3xl font-bold text-foreground">#{user.globalRank}</p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <StatCard label="Futra Score" value={user.futraScore} icon={Trophy} />
          <StatCard label="Futra Credits" value={user.futraCredits.toLocaleString()} icon={Coins} />
          <StatCard label="Accuracy" value={`${user.accuracyRate}%`} icon={Target} />
          <StatCard label="Streak" value={user.streak} icon={Zap} change={user.streak > 5 ? `+${user.streak} correct` : undefined} />
        </div>

        {/* More stats */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground mb-4">Prediction history</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total predictions</span>
                <span className="text-foreground font-medium">{user.totalPredictions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Resolved</span>
                <span className="text-foreground font-medium">{user.resolvedPredictions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending</span>
                <span className="text-foreground font-medium">{user.totalPredictions - user.resolvedPredictions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Win rate</span>
                <span className="text-emerald font-medium">{user.accuracyRate}%</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground mb-4">Badges</h2>
            {user.badges.length > 0 ? (
              <div className="space-y-3">
                {user.badges.map(badge => (
                  <div key={badge.id} className="flex items-center gap-3">
                    <span className="text-2xl">{badge.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No badges earned yet.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
