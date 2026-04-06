import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { VoteBar } from '@/components/futra/VoteBar';
import { CategoryBadge } from '@/components/futra/CategoryBadge';
import { StatusBadge } from '@/components/futra/StatusBadge';
import { CountdownTimer } from '@/components/futra/CountdownTimer';
import { ShareButton } from '@/components/futra/ShareButton';
import { WatchlistButton } from '@/components/futra/WatchlistButton';
import { CommentSection } from '@/components/futra/CommentSection';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Users, Coins, Shield, ExternalLink, CheckCircle, Loader2, FileQuestion, Lock, Trophy } from 'lucide-react';
import { useMarket } from '@/hooks/useMarkets';
import { useRealtimeMarket } from '@/hooks/useRealtimeMarket';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatePrediction } from '@/hooks/usePrediction';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/futra/Skeletons';
import { SEO } from '@/components/SEO';

function formatNumber(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}

function MarketDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex gap-2"><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-3/4" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  useRealtimeMarket(id || '');
  const { data: market, isLoading, isError, refetch } = useMarket(id || '');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [credits, setCredits] = useState(100);
  const [confirmed, setConfirmed] = useState(false);
  const { user, profile } = useAuth();
  const createPrediction = useCreatePrediction();

  if (isLoading) {
    return <Layout><div className="container mx-auto px-4 py-8 max-w-4xl"><MarketDetailSkeleton /></div></Layout>;
  }

  if (isError) {
    return <Layout><div className="container mx-auto px-4 py-8"><ErrorState onRetry={() => refetch()} /></div></Layout>;
  }

  if (!market) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            icon={<FileQuestion className="h-10 w-10 text-muted-foreground" />}
            title="Mercado não encontrado"
            description="Este mercado pode ter sido removido ou o link está incorreto."
            action={<Button variant="outline" asChild><Link to="/browse">Explorar mercados</Link></Button>}
          />
        </div>
      </Layout>
    );
  }

  const isLocked = market.status === 'open' && market.lock_date && new Date(market.lock_date) <= new Date();
  const isResolved = market.status === 'resolved';
  const isClosed = market.status === 'closed';
  const canBet = market.status === 'open' && !isLocked;

  const winningOption = isResolved && market.resolved_option
    ? market.options.find(o => o.id === market.resolved_option)
    : null;

  const topOption = [...market.options].sort((a, b) => b.percentage - a.percentage)[0];
  const selectedOpt = market.options.find(o => o.id === selectedOption);
  const maxCredits = Math.min(1000, profile?.futra_credits || 1000);
  const potentialReward = selectedOpt ? Math.round(credits * (100 / (selectedOpt.percentage || 1)) * 0.85) : 0;
  const submitting = createPrediction.isPending;

  const shareUrl = `${window.location.origin}/market/${market.id}`;
  const shareText = topOption
    ? `"${market.question}" — ${topOption.percentage}% dizem ${topOption.label} | @fuabordo`
    : market.question;

  const ogImageUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-image?id=${market.id}`;

  const handleConfirm = async () => {
    if (!user || !selectedOption) return;
    createPrediction.mutate(
      { marketId: market.id, selectedOption, credits },
      { onSuccess: () => setConfirmed(true) }
    );
  };

  return (
    <Layout>
      <SEO
        title={`${market.question} — FUTRA`}
        description={topOption ? `${topOption.percentage}% dizem ${topOption.label}. ${market.total_participants} participantes.` : market.description}
        ogImage={ogImageUrl}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Resolved banner */}
        {isResolved && winningOption && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-foreground">
              Este mercado foi resolvido. <span className="font-bold text-emerald-400">{winningOption.label}</span> foi o resultado correto.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <CategoryBadge category={market.category as any} />
            <StatusBadge status={market.status as 'open' | 'closed' | 'resolved'} />
            <CountdownTimer endDate={market.end_date} className="ml-auto" />
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight">{market.question}</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-2xl">{market.description}</p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm mb-8">
          <span className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-4 w-4" /> {formatNumber(market.total_participants)} participantes</span>
          <span className="flex items-center gap-1.5 text-muted-foreground"><Coins className="h-4 w-4" /> {formatNumber(market.total_credits)} FC apostados</span>
          <div className="ml-auto flex items-center gap-1">
            <WatchlistButton marketId={market.id} compact />
            <ShareButton title={market.question} text={shareText} url={shareUrl} />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Probability section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Option cards */}
            <div className="space-y-3">
              <h2 className="font-semibold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Probabilidades atuais</h2>
              <div className="space-y-0 rounded-xl border border-border/30 bg-card overflow-hidden">
                {market.options.map((opt, idx) => {
                  const isWinner = isResolved && opt.id === market.resolved_option;
                  const isLoser = isResolved && opt.id !== market.resolved_option;
                  const isLeader = opt.id === topOption.id;
                  return (
                    <div key={opt.id} className={cn(
                      'relative p-4 overflow-hidden transition-all',
                      idx < market.options.length - 1 && 'border-b border-border/20',
                      isWinner && 'bg-emerald/10',
                      isLoser && 'opacity-50',
                    )}>
                      {/* Background fill bar */}
                      <div
                        className={cn(
                          'absolute inset-0 transition-all duration-500',
                          isWinner ? 'bg-emerald/10' : isLeader ? 'bg-primary/8' : 'bg-primary/4'
                        )}
                        style={{ width: `${opt.percentage}%` }}
                      />
                      <div className="relative flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            {isWinner && <CheckCircle className="h-4 w-4 text-emerald" />}
                            {opt.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatNumber(opt.votes)} votos · {formatNumber(opt.creditsAllocated)} FC</p>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            'font-display text-3xl font-bold',
                            isWinner ? 'text-emerald glow-text-emerald' : isLeader ? 'text-foreground glow-text' : 'text-muted-foreground'
                          )}>
                            {opt.percentage}%
                          </span>
                          <p className="text-xs text-muted-foreground font-display">
                            {(opt.percentage / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vote bar */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground mb-4">Distribuição</h2>
              <VoteBar options={market.options} type={market.type as any} />
            </div>

            {/* Resolution info */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Regras de resolução</h2>
              <p className="text-sm text-muted-foreground mb-3">{market.resolution_rules}</p>
              {market.resolution_source && (
                <div className="flex items-center gap-2 text-sm">
                  <ExternalLink className="h-3 w-3 text-primary" />
                  <span className="text-primary">{market.resolution_source}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">Encerra em: {new Date(market.end_date).toLocaleDateString('pt-BR')}</p>
            </div>

            {/* Comments */}
            <CommentSection marketId={market.id} />
          </div>

          {/* Voting panel - desktop */}
          <div className="lg:col-span-1 hidden lg:block">
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-6 space-y-5">
              <VotingPanelContent
                market={market}
                isResolved={isResolved}
                isClosed={isClosed}
                isLocked={!!isLocked}
                canBet={canBet}
                confirmed={confirmed}
                submitting={submitting}
                selectedOption={selectedOption}
                selectedOpt={selectedOpt}
                credits={credits}
                maxCredits={maxCredits}
                potentialReward={potentialReward}
                winningOption={winningOption}
                user={user}
                profile={profile}
                setSelectedOption={setSelectedOption}
                setCredits={setCredits}
                setConfirmed={setConfirmed}
                handleConfirm={handleConfirm}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile floating action bar */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 p-4 glass-header" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {canBet ? (
          <div className="space-y-3">
            {selectedOption ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {selectedOpt?.label} · <span className="text-foreground font-medium">{credits} FC</span>
                  </span>
                  <span className="text-emerald font-bold">→ {potentialReward} FC</span>
                </div>
                <Slider
                  value={[credits]}
                  onValueChange={([v]) => setCredits(v)}
                  min={10}
                  max={maxCredits}
                  step={10}
                  className="w-full"
                />
                {user ? (
                  <Button className="w-full gradient-primary border-0" onClick={handleConfirm} disabled={submitting}>
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Confirmando...</> : 'Fazer previsão'}
                  </Button>
                ) : (
                  <Button className="w-full gradient-primary border-0" asChild>
                    <Link to="/login">Entrar para prever</Link>
                  </Button>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                {market.options.map(opt => (
                  <Button
                    key={opt.id}
                    variant="outline"
                    className="flex-1 text-sm"
                    onClick={() => setSelectedOption(opt.id)}
                  >
                    {opt.label} <span className="ml-1 text-muted-foreground">{opt.percentage}%</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : isResolved && winningOption ? (
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Resultado: </span>
            <span className="text-emerald font-bold">{winningOption.label}</span>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">Este mercado não está mais aceitando previsões.</p>
        )}
      </div>
    </Layout>
  );
}

// Extracted to keep things clean
function VotingPanelContent({ market, isResolved, isClosed, isLocked, canBet, confirmed, submitting, selectedOption, selectedOpt, credits, maxCredits, potentialReward, winningOption, user, profile, setSelectedOption, setCredits, setConfirmed, handleConfirm }: any) {
  if (isResolved) {
    return (
      <div className="text-center py-6">
        <Trophy className="h-12 w-12 text-emerald mx-auto mb-3" />
        <h3 className="font-display font-bold text-foreground text-lg">Mercado resolvido</h3>
        {winningOption && (
          <p className="text-sm text-muted-foreground mt-2">
            Resultado: <span className="text-emerald font-bold">{winningOption.label}</span>
          </p>
        )}
        <Button className="mt-4 w-full" variant="outline" asChild>
          <Link to="/browse">Explorar outros mercados</Link>
        </Button>
      </div>
    );
  }

  if (isClosed || isLocked) {
    return (
      <div className="text-center py-6">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-display font-bold text-foreground text-lg">
          {isClosed ? 'Mercado fechado' : 'Mercado travado'}
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Este mercado não está mais aceitando previsões.
        </p>
        <Button className="mt-4 w-full" variant="outline" asChild>
          <Link to="/browse">Explorar outros mercados</Link>
        </Button>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="text-center py-6">
        <CheckCircle className="h-12 w-12 text-emerald mx-auto mb-3" />
        <h3 className="font-display font-bold text-foreground text-lg">Previsão confirmada!</h3>
        <p className="text-sm text-muted-foreground mt-2">Você escolheu <span className="text-emerald font-medium">{selectedOpt?.label}</span> com {credits} créditos.</p>
        <Button className="mt-4 w-full" variant="outline" onClick={() => { setConfirmed(false); setSelectedOption(null); }}>Fazer outra previsão</Button>
      </div>
    );
  }

  return (
    <>
      <h3 className="font-display font-semibold text-foreground">Faça sua previsão</h3>
      <div className="space-y-2">
        {market.options.map((opt: any) => (
          <button key={opt.id} onClick={() => setSelectedOption(opt.id)} className={cn('w-full text-left p-3 rounded-lg border transition-all text-sm', selectedOption === opt.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground')}>
            <div className="flex justify-between"><span className="font-medium">{opt.label}</span><span>{opt.percentage}%</span></div>
          </button>
        ))}
      </div>

      {selectedOption && (
        <div className="space-y-3 animate-fade-in">
          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Alocar créditos</label>
            <Slider
              value={[credits]}
              onValueChange={([v]) => setCredits(v)}
              min={10}
              max={maxCredits}
              step={10}
              className="w-full mt-3"
            />
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">10</span>
              <span className="font-display font-bold text-foreground">{credits} FC</span>
              <span className="text-muted-foreground">{maxCredits}</span>
            </div>
          </div>
          <div className="rounded-lg bg-surface-800 p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Você arrisca</span><span className="text-foreground font-medium">{credits} FC</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Recompensa potencial</span><span className="text-emerald font-bold">{potentialReward} FC</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Seu saldo</span><span className="text-foreground">{profile?.futra_credits?.toLocaleString() || '—'} FC</span></div>
          </div>
          {user ? (
            <Button className="w-full gradient-primary border-0" onClick={handleConfirm} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Confirmando...</> : 'Fazer previsão'}
            </Button>
          ) : (
            <Button className="w-full gradient-primary border-0" asChild>
              <Link to="/login">Entrar para prever</Link>
            </Button>
          )}
        </div>
      )}

      {!user && !selectedOption && (
        <p className="text-xs text-muted-foreground text-center">
          <Link to="/login" className="text-primary hover:underline">Entrar</Link> para fazer previsões
        </p>
      )}
    </>
  );
}
