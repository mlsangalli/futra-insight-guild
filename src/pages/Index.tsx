import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, Target, Coins, Trophy, TrendingUp } from 'lucide-react';
import { useMarkets, useLeaderboard } from '@/hooks/useMarkets';
import { CATEGORIES } from '@/data/types';
import { MarketGridSkeleton, HeroMarketSkeleton, LeaderboardSkeleton, ErrorState, EmptyState } from '@/components/futra/Skeletons';

function dbToCard(m: any) {
  return {
    id: m.id, question: m.question, description: m.description, category: m.category,
    type: m.type, status: m.status, options: m.options, totalParticipants: m.total_participants,
    totalCredits: m.total_credits, endDate: m.end_date, createdAt: m.created_at,
    resolutionSource: m.resolution_source || '', resolutionRules: m.resolution_rules || '',
    featured: m.featured, trending: m.trending,
  };
}

export default function HomePage() {
  const { data: allMarkets, isLoading, isError, refetch } = useMarkets();
  const { data: topUsers, isLoading: loadingUsers } = useLeaderboard();

  const markets = allMarkets || [];
  const featured = markets.filter(m => m.featured);
  const trending = markets.filter(m => m.trending);
  const popular = [...markets].sort((a, b) => b.total_participants - a.total_participants).slice(0, 6);
  const ending = [...markets].sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime()).slice(0, 3);

  const heroMarket = featured[0];
  const heroCard = heroMarket ? dbToCard(heroMarket) : null;
  const heroLeader = heroCard
    ? [...heroCard.options].sort((a: any, b: any) => b.percentage - a.percentage)[0]
    : null;

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden particle-bg">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-[radial-gradient(ellipse,hsl(var(--neon-blue)/0.12)_0%,hsl(var(--emerald)/0.06)_40%,transparent_70%)] pointer-events-none" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-xl">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
                Predict the future.<br /><span className="gradient-primary-text">Build your reputation.</span>
              </h1>
              <p className="mt-5 text-lg text-secondary-foreground leading-relaxed">The social forecasting platform where your predictions build status, reputation, and influence. No real money. Just conviction.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" className="gradient-primary border-0 text-base px-8" asChild><Link to="/browse">Explore markets <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                <Button size="lg" variant="outline" className="text-base px-8" asChild><Link to="/leaderboard">See leaderboard</Link></Button>
              </div>
            </div>

            <div className="hidden lg:block">
              {isLoading ? (
                <HeroMarketSkeleton />
              ) : heroCard && heroLeader ? (
                <div className="glass-card gradient-border rounded-2xl p-8 animate-fade-in">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Featured Market</p>
                  <h3 className="font-display text-xl font-bold text-foreground mb-6 leading-snug">{heroCard.question}</h3>
                  <div className="flex items-end gap-3 mb-6">
                    <span className="font-display text-6xl font-bold text-emerald glow-text-emerald leading-none">{heroLeader.percentage}%</span>
                    <span className="text-lg text-muted-foreground font-medium pb-1">{heroLeader.label}</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted/50 overflow-hidden mb-4">
                    <div className="h-full bg-emerald rounded-full bar-glow-emerald transition-all duration-700" style={{ width: `${heroLeader.percentage}%` }} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{heroCard.totalParticipants.toLocaleString()} participants</span>
                    <span>{heroCard.totalCredits.toLocaleString()} FC staked</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {featured.slice(0, 4).map((m, i) => (
                    <div key={m.id} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                      <MarketCard market={dbToCard(m)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {isError ? (
        <div className="container mx-auto px-4 py-12">
          <ErrorState onRetry={() => refetch()} />
        </div>
      ) : (
        <>
          {/* Trending */}
          <section className="container mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Trending</h2>
              <Link to="/browse?filter=trending" className="text-sm text-primary hover:underline">View all →</Link>
            </div>
            {isLoading ? <MarketGridSkeleton count={3} /> : trending.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trending.slice(0, 6).map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
              </div>
            ) : (
              <EmptyState title="Nenhum mercado em alta" description="Novos mercados em alta aparecerão aqui." />
            )}
          </section>

          {/* Popular */}
          <section className="container mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground">Popular this week</h2>
              <Link to="/browse?filter=popular" className="text-sm text-primary hover:underline">View all →</Link>
            </div>
            {isLoading ? <MarketGridSkeleton count={6} /> : popular.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {popular.map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
              </div>
            ) : (
              <EmptyState title="Nenhum mercado popular ainda" description="Mercados com mais participantes aparecerão aqui." />
            )}
          </section>

          {/* Ending Soon */}
          <section className="container mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground">⏰ Ending soon</h2>
              <Link to="/browse?filter=ending" className="text-sm text-primary hover:underline">View all →</Link>
            </div>
            {isLoading ? <MarketGridSkeleton count={3} /> : ending.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ending.map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
              </div>
            ) : (
              <EmptyState title="Nenhum mercado encerrando" description="Mercados próximos do prazo aparecerão aqui." />
            )}
          </section>
        </>
      )}

      {/* Top Forecasters */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2"><Trophy className="h-5 w-5 text-emerald" /> Top forecasters</h2>
          <Link to="/leaderboard" className="text-sm text-primary hover:underline">Full leaderboard →</Link>
        </div>
        {loadingUsers ? (
          <LeaderboardSkeleton count={5} />
        ) : (topUsers || []).length > 0 ? (
          <div className="rounded-xl glass-card divide-y divide-border/50">
            {(topUsers || []).slice(0, 5).map((user: any, i: number) => (
              <Link key={user.id} to={`/profile/${user.username}`} className="flex items-center gap-3 p-4 hover:bg-surface-800/50 transition-colors">
                <span className="font-display font-bold text-lg w-8 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">{user.display_name?.charAt(0) || '?'}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{user.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
                <div className="text-right shrink-0"><p className="font-display font-bold text-foreground glow-text">{user.futra_score}</p></div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhum forecaster ainda" description="Seja o primeiro a fazer previsões!" action={<Button variant="outline" asChild><Link to="/browse">Explorar mercados</Link></Button>} />
        )}
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">Explore categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map(cat => (
            <Link key={cat.key} to={`/category/${cat.key}`} className="flex flex-col items-center gap-2 p-6 rounded-xl glass-card transition-all duration-300">
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
            { icon: TrendingUp, title: 'Earn rewards', desc: "Win credits when you're right. Earn more for bold calls." },
            { icon: Trophy, title: 'Build reputation', desc: 'Climb the leaderboard and unlock Elite status.' },
          ].map((step, i) => (
            <div key={i} className="text-center p-6 rounded-xl glass-card">
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4"><step.icon className="h-6 w-6 text-primary-foreground" /></div>
              <h3 className="font-display font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Brand block */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-2xl gradient-primary p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--foreground)/0.08)_0%,transparent_60%)] pointer-events-none" />
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4 relative">Make uncertainty legible.</h2>
          <p className="text-primary-foreground/80 max-w-lg mx-auto mb-8 relative">FUTRA transforms collective intelligence into signal. Join thousands of forecasters building reputation through accuracy.</p>
          <Button size="lg" variant="secondary" className="text-base px-8 relative" asChild><Link to="/signup">Get started free</Link></Button>
        </div>
      </section>
    </Layout>
  );
}
