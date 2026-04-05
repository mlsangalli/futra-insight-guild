import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, Target, Coins, Trophy, TrendingUp, Loader2 } from 'lucide-react';
import { useMarkets, useLeaderboard } from '@/hooks/useMarkets';
import { CATEGORIES } from '@/data/types';

function dbToCard(m: any) {
  return {
    id: m.id,
    question: m.question,
    description: m.description,
    category: m.category,
    type: m.type,
    status: m.status,
    options: m.options,
    totalParticipants: m.total_participants,
    totalCredits: m.total_credits,
    endDate: m.end_date,
    createdAt: m.created_at,
    resolutionSource: m.resolution_source || '',
    resolutionRules: m.resolution_rules || '',
    featured: m.featured,
    trending: m.trending,
  };
}

export default function HomePage() {
  const { data: allMarkets, isLoading } = useMarkets();
  const { data: topUsers } = useLeaderboard();

  const markets = allMarkets || [];
  const featured = markets.filter(m => m.featured);
  const trending = markets.filter(m => m.trending);
  const popular = [...markets].sort((a, b) => b.total_participants - a.total_participants).slice(0, 6);
  const ending = [...markets].sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime()).slice(0, 3);

  if (isLoading) {
    return <Layout><div className="container mx-auto px-4 py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div></Layout>;
  }

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-xl">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] text-foreground">
                Predict the future.
                <br />
                <span className="gradient-primary-text">Build your reputation.</span>
              </h1>
              <p className="mt-6 text-base text-secondary-foreground leading-relaxed max-w-md">
                The social forecasting platform where your predictions build status, reputation, and influence. No real money. Just conviction.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button size="lg" className="gradient-primary border-0 text-sm px-8 h-11" asChild>
                  <Link to="/browse">Explore markets <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="text-sm px-8 h-11 border-border/60 text-muted-foreground hover:text-foreground" asChild>
                  <Link to="/leaderboard">See leaderboard</Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {featured.slice(0, 4).map((m, i) => (
                <div key={m.id} className="animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                  <MarketCard market={dbToCard(m)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trending */}
      <section className="container mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Trending
          </h2>
          <Link to="/browse?filter=trending" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            View all →
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trending.slice(0, 6).map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
        </div>
      </section>

      {/* Popular */}
      <section className="container mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-xl font-bold text-foreground">Popular this week</h2>
          <Link to="/browse?filter=popular" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            View all →
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popular.map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
        </div>
      </section>

      {/* Ending Soon */}
      <section className="container mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-xl font-bold text-foreground">⏰ Ending soon</h2>
          <Link to="/browse?filter=ending" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            View all →
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ending.map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
        </div>
      </section>

      {/* Top Forecasters */}
      <section className="container mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald" /> Top forecasters
          </h2>
          <Link to="/leaderboard" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Full leaderboard →
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
          {(topUsers || []).slice(0, 5).map((user: any, i: number) => (
            <Link key={user.id} to={`/profile/${user.username}`} className="flex items-center gap-3 p-4 hover:bg-surface-800/50 transition-colors">
              <span className="font-display font-bold text-sm w-8 text-center text-muted-foreground">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                {user.display_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{user.display_name}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="stat-number text-lg text-foreground">{user.futra_score}</p>
              </div>
            </Link>
          ))}
          {(!topUsers || topUsers.length === 0) && (
            <div className="p-10 text-center text-muted-foreground text-sm">No forecasters yet. Be the first!</div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-14">
        <h2 className="font-display text-xl font-bold text-foreground mb-8">Explore categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map(cat => (
            <Link key={cat.key} to={`/category/${cat.key}`} className="flex flex-col items-center gap-2 p-6 rounded-xl border border-border bg-card card-hover">
              <span className="text-2xl">{cat.emoji}</span>
              <span className="font-medium text-xs text-secondary-foreground">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="font-display text-xl font-bold text-foreground text-center mb-12">How FUTRA works</h2>
        <div className="grid md:grid-cols-4 gap-5">
          {[
            { icon: Target, title: 'Choose a side', desc: 'Pick Yes, No, or your favorite option on any market.' },
            { icon: Coins, title: 'Allocate credits', desc: 'Use your Futra Credits to back your prediction.' },
            { icon: TrendingUp, title: 'Earn rewards', desc: "Win credits when you're right. Earn more for bold calls." },
            { icon: Trophy, title: 'Build reputation', desc: 'Climb the leaderboard and unlock Elite status.' },
          ].map((step, i) => (
            <div key={i} className="text-center p-6 rounded-xl border border-border bg-card">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-foreground text-sm mb-2">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Brand CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-emerald/[0.04] p-12 md:p-16 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            Make uncertainty legible.
          </h2>
          <p className="text-secondary-foreground text-sm max-w-md mx-auto mb-8 leading-relaxed">
            FUTRA transforms collective intelligence into signal. Join thousands of forecasters building reputation through accuracy.
          </p>
          <Button size="lg" className="gradient-primary border-0 text-sm px-8 h-11" asChild>
            <Link to="/signup">Get started free</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
