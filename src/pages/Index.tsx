import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { StatusBadge } from '@/components/futra/StatusBadge';
import { CountdownTimer } from '@/components/futra/CountdownTimer';
import { VoteBar } from '@/components/futra/VoteBar';
import { Button } from '@/components/ui/button';
import { ArrowRight, Target, Coins, Trophy, TrendingUp, Users } from 'lucide-react';
import { useHomeFeeds, useLeaderboard } from '@/hooks/useMarkets';
import { CATEGORIES } from '@/types';
import { MarketGridSkeleton, HeroMarketSkeleton, LeaderboardSkeleton, ErrorState, EmptyState } from '@/components/futra/Skeletons';
import { SEO } from '@/components/SEO';
import { useRealtimeMarkets } from '@/hooks/useRealtimeMarket';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { DailyBonusBanner } from '@/components/futra/DailyBonusBanner';

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
  useRealtimeMarkets();
  const { data: feeds, isLoading, isError, refetch } = useHomeFeeds();
  const { data: topUsers, isLoading: loadingUsers } = useLeaderboard();

  const featured = feeds?.featured || [];
  const trending = feeds?.trending || [];
  const popular = feeds?.popular || [];
  const ending = feeds?.ending_soon || [];
  const allMarkets = [...featured, ...trending, ...popular, ...ending];
  // Deduplicate for stats
  const markets = Array.from(new Map(allMarkets.map(m => [m.id, m])).values());

  const heroMarket = featured[0];
  const heroCard = heroMarket ? dbToCard(heroMarket) : null;
  const heroLeader = heroCard
    ? [...heroCard.options].sort((a: any, b: any) => b.percentage - a.percentage)[0]
    : null;

  const totalParticipants = useMemo(() => markets.reduce((sum, m) => sum + m.total_participants, 0), [markets]);

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    markets.filter(m => m.status === 'open').forEach(m => {
      counts[m.category] = (counts[m.category] || 0) + 1;
    });
    return counts;
  }, [markets]);

  const { user } = useAuth();

  const isEndingSoon = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  };

  return (
    <Layout>
      <SEO />
      {user && (
        <div className="container mx-auto px-4 pt-4">
          <DailyBonusBanner />
        </div>
      )}
      {/* Hero */}
      {heroCard && heroLeader ? (
        <section className="relative overflow-hidden particle-bg">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] rounded-full bg-[radial-gradient(ellipse,hsl(var(--neon-blue)/0.18)_0%,hsl(var(--emerald)/0.08)_40%,transparent_70%)] pointer-events-none" />
          <div className="container mx-auto px-4 py-12 md:py-24 relative z-10">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="max-w-xl">
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
                  Preveja o futuro.<br /><span className="gradient-primary-text">Construa sua reputação.</span>
                </h1>
                <p className="mt-5 text-lg text-secondary-foreground leading-relaxed">A plataforma social de previsões onde suas apostas constroem status, reputação e influência. Sem dinheiro real — apenas convicção.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button size="lg" className="gradient-primary border-0 text-base px-8" asChild><Link to="/browse">Explorar mercados <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                  <Button size="lg" variant="outline" className="text-base px-8" asChild><Link to="/leaderboard">Ver ranking</Link></Button>
                </div>
                {!isLoading && markets.length > 0 && (
                  <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{markets.length} mercados ativos</span>
                    <span>•</span>
                    <span>{totalParticipants.toLocaleString()} previsões feitas</span>
                  </div>
                )}
              </div>

              <div className="mt-8 lg:mt-0">
                {isLoading ? (
                  <HeroMarketSkeleton />
                ) : (
                  <Link to={`/market/${heroCard.id}`} className="block glass-card gradient-border hero-card-glow rounded-2xl p-6 sm:p-8 animate-fade-in hover:scale-[1.01] transition-transform cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">Mercado em destaque</p>
                        {heroMarket.status === 'open' && (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                            AO VIVO
                          </span>
                        )}
                      </div>
                      <StatusBadge status={heroMarket.status as 'open' | 'closed' | 'resolved'} />
                    </div>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6 leading-snug">{heroCard.question}</h3>
                    <div className="mb-4">
                      <VoteBar options={heroCard.options} type={heroCard.type as any} />
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>{heroCard.totalParticipants.toLocaleString()} participantes</span>
                        <span>{heroCard.totalCredits.toLocaleString()} FC apostados</span>
                      </div>
                      <CountdownTimer endDate={heroCard.endDate} />
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden particle-bg">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] rounded-full bg-[radial-gradient(ellipse,hsl(var(--neon-blue)/0.18)_0%,hsl(var(--emerald)/0.08)_40%,transparent_70%)] pointer-events-none" />
          <div className="container mx-auto px-4 py-16 md:py-28 relative z-10 text-center">
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight text-foreground mb-6">
              Torne a incerteza <span className="gradient-primary-text">legível</span>.
            </h1>
            <p className="text-lg md:text-xl text-secondary-foreground max-w-2xl mx-auto mb-8">
              Preveja o futuro, construa reputação e suba no ranking. A plataforma social de previsões que transforma opiniões em dados.
            </p>
            <div className="flex justify-center gap-3">
              <Button size="lg" className="gradient-primary border-0 text-base px-8" asChild>
                <Link to="/browse">Explorar mercados <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <Link to="/signup">Criar conta grátis</Link>
              </Button>
            </div>
            {!isLoading && markets.length > 0 && (
              <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{markets.length} mercados ativos</span>
                <span>•</span>
                <span>{totalParticipants.toLocaleString()} previsões feitas</span>
              </div>
            )}
          </div>
        </section>
      )}

      {isError ? (
        <div className="container mx-auto px-4 py-12">
          <ErrorState onRetry={() => refetch()} />
        </div>
      ) : (
        <>
          {/* Trending */}
          <section className="container mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Em alta</h2>
              <Link to="/browse?filter=trending" className="text-sm text-primary hover:underline">Ver todos →</Link>
            </div>
            {isLoading ? <MarketGridSkeleton count={3} /> : trending.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trending.slice(0, 6).map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
              </div>
            ) : (
              <EmptyState title="Nenhum mercado em alta" description="Mercados em alta aparecerão aqui." />
            )}
          </section>

          {/* Popular */}
          <section className="container mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground">Populares esta semana</h2>
              <Link to="/browse?filter=popular" className="text-sm text-primary hover:underline">Ver todos →</Link>
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
              <h2 className="font-display text-2xl font-bold text-foreground">⏰ Encerrando em breve</h2>
              <Link to="/browse?filter=ending" className="text-sm text-primary hover:underline">Ver todos →</Link>
            </div>
            {isLoading ? <MarketGridSkeleton count={3} /> : ending.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ending.map(m => (
                  <div key={m.id} className={cn(isEndingSoon(m.end_date) && '[&_*]:data-[countdown]:text-destructive')}>
                    <MarketCard market={dbToCard(m)} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Nenhum mercado encerrando em breve" description="Mercados próximos do prazo aparecerão aqui." />
            )}
          </section>
        </>
      )}

      {/* Top Forecasters */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2"><Trophy className="h-5 w-5 text-emerald" /> Melhores previsores</h2>
          <Link to="/leaderboard" className="text-sm text-primary hover:underline">Ranking completo →</Link>
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
          <EmptyState title="Nenhum previsor ainda" description="Seja o primeiro a fazer previsões!" action={<Button variant="outline" asChild><Link to="/browse">Explorar mercados</Link></Button>} />
        )}
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">Explorar categorias</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map(cat => {
            const count = countByCategory[cat.key] || 0;
            return (
              <Link
                key={cat.key}
                to={`/category/${cat.key}`}
                className={cn(
                  'flex flex-col items-center gap-2 p-6 rounded-xl glass-card transition-all duration-300 hover:border-primary/50 hover:scale-[1.02]',
                  count === 0 && 'opacity-60'
                )}
              >
                <span className="text-3xl">{cat.emoji}</span>
                <span className="font-medium text-sm text-foreground">{cat.label}</span>
                <span className="text-xs text-muted-foreground">{count} {count === 1 ? 'mercado' : 'mercados'}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="font-display text-2xl font-bold text-foreground text-center mb-10">Como a FUTRA funciona</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: Target, title: 'Escolha um lado', desc: 'Escolha Sim, Não ou sua opção favorita em qualquer mercado.' },
            { icon: Coins, title: 'Aposte seus créditos', desc: 'Use seus Futra Credits para reforçar sua previsão.' },
            { icon: TrendingUp, title: 'Ganhe recompensas', desc: 'Ganhe créditos quando acertar. Quanto mais ousada a aposta, maior o prêmio.' },
            { icon: Trophy, title: 'Construa reputação', desc: 'Suba no ranking e alcance o status Elite.' },
          ].map((s, i) => (
            <div key={i} className="text-center p-6 rounded-xl glass-card">
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4"><s.icon className="h-6 w-6 text-primary-foreground" /></div>
              <h3 className="font-display font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Brand block */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-2xl gradient-primary p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--foreground)/0.08)_0%,transparent_60%)] pointer-events-none" />
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4 relative">Torne a incerteza legível.</h2>
          <p className="text-primary-foreground/80 max-w-lg mx-auto mb-8 relative">A FUTRA transforma inteligência coletiva em sinal. Junte-se a milhares de previsores construindo reputação baseada em dados.</p>
          <Button size="lg" variant="secondary" className="text-base px-8 relative" asChild><Link to="/signup">Comece grátis</Link></Button>
        </div>
      </section>
    </Layout>
  );
}
