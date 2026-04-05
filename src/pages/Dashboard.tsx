import { Layout } from '@/components/layout/Layout';
import { StatCard } from '@/components/futra/StatCard';
import { MarketCard } from '@/components/futra/MarketCard';
import { InfluenceBadge } from '@/components/futra/InfluenceBadge';
import { mockUsers } from '@/data/mock-users';
import { mockMarkets } from '@/data/mock-markets';
import { Trophy, Coins, Target, TrendingUp, Bookmark, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const TABS = ['Open', 'Resolved', 'Watchlist'];

export default function DashboardPage() {
  const user = mockUsers[0]; // Mock current user
  const [tab, setTab] = useState('Open');
  const openMarkets = mockMarkets.slice(0, 4);
  const resolvedMarkets = mockMarkets.slice(4, 7);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {user.displayName}</p>
          </div>
          <InfluenceBadge level={user.influenceLevel} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Futra Credits" value={user.futraCredits.toLocaleString()} icon={Coins} change="+250 today" />
          <StatCard label="Futra Score" value={user.futraScore} icon={Trophy} change="+12 this week" />
          <StatCard label="Accuracy" value={`${user.accuracyRate}%`} icon={Target} />
          <StatCard label="Global Rank" value={`#${user.globalRank}`} icon={TrendingUp} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'Open' && (
          <div className="grid md:grid-cols-2 gap-4">
            {openMarkets.map(m => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        )}
        {tab === 'Resolved' && (
          <div className="grid md:grid-cols-2 gap-4">
            {resolvedMarkets.map(m => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        )}
        {tab === 'Watchlist' && (
          <div className="text-center py-16">
            <Bookmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No saved markets yet.</p>
          </div>
        )}

        {/* Badges */}
        <div className="mt-10">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Your badges</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {user.badges.map(badge => (
              <div key={badge.id} className="rounded-xl border border-border bg-card p-4 text-center">
                <span className="text-3xl">{badge.icon}</span>
                <p className="text-sm font-medium text-foreground mt-2">{badge.name}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
            ))}
            {user.badges.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">Earn badges by making accurate predictions!</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
