import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { LeaderboardRow } from '@/components/futra/LeaderboardRow';
import { Button } from '@/components/ui/button';
import { ArrowRight, Target, Coins, Trophy, TrendingUp } from 'lucide-react';
import { featuredMarkets, trendingMarkets, endingSoonMarkets, mockMarkets } from '@/data/mock-markets';
import { getTopUsers } from '@/data/mock-users';
import { CATEGORIES } from '@/data/types';

export default function HomePage() {
  const topUsers = getTopUsers(5);
  const popularMarkets = [...mockMarkets].sort((a, b) => b.totalParticipants - a.totalParticipants).slice(0, 6);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-xl">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
                Predict the future.
                <br />
                <span className="gradient-primary-text">Build your reputation.</span>
              </h1>
              <p className="mt-5 text-lg text-secondary-foreground leading-relaxed">
                The social forecasting platform where your predictions build status, reputation, and influence. No real money. Just conviction.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" className="gradient-primary border-0 text-base px-8" asChild>
                  <Link to="/browse">Explore markets <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base px-8" asChild>
                  <Link to="/leaderboard">See leaderboard</Link>
                </Button>
              </div>
            </div>

            {/* Hero cards */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {featuredMarkets.slice(0, 4).map((m, i) => (
                <div key={m.id} className={`animate-fade-in`} style={{ animationDelay: `${i * 100}ms` }}>
                  <MarketCard market={m} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trending */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Trending
          </h2>
          <Link to="/browse?filter=trending" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trendingMarkets.slice(0, 6).map(m => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      </section>

      {/* Popular this week */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground">Popular this week</h2>
          <Link to="/browse?filter=popular" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularMarkets.slice(0, 6).map(m => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      </section>

      {/* Ending Soon */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground">⏰ Ending soon</h2>
          <Link to="/browse?filter=ending" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {endingSoonMarkets.slice(0, 3).map(m => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      </section>

      {/* Top Forecasters */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald" /> Top forecasters
          </h2>
          <Link to="/leaderboard" className="text-sm text-primary hover:underline">Full leaderboard →</Link>
        </div>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {topUsers.map((user, i) => (
            <LeaderboardRow key={user.id} user={user} rank={i + 1} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">Explore categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.key}
              to={`/category/${cat.key}`}
              className="flex flex-col items-center gap-2 p-6 rounded-xl border border-border bg-card hover:border-primary/30 hover:glow-blue transition-all"
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="font-medium text-sm text-foreground">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="font-display text-2xl font-bold text-foreground text-center mb-10">How FUTRA works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: Target, title: 'Choose a side', desc: 'Pick Yes, No, or your favorite option on any market.' },
            { icon: Coins, title: 'Allocate credits', desc: 'Use your Futra Credits to back your prediction.' },
            { icon: TrendingUp, title: 'Earn rewards', desc: 'Win credits when you\'re right. Earn more for bold calls.' },
            { icon: Trophy, title: 'Build reputation', desc: 'Climb the leaderboard and unlock Elite status.' },
          ].map((step, i) => (
            <div key={i} className="text-center p-6 rounded-xl border border-border bg-card">
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Brand block */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-2xl gradient-primary p-10 md:p-16 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Make uncertainty legible.
          </h2>
          <p className="text-primary-foreground/80 max-w-lg mx-auto mb-8">
            FUTRA transforms collective intelligence into signal. Join thousands of forecasters building reputation through accuracy.
          </p>
          <Button size="lg" variant="secondary" className="text-base px-8" asChild>
            <Link to="/signup">Get started free</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
