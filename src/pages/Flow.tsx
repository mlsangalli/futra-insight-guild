import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, Loader2, Zap } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { useFlowFeed, useFlowSession, useRecordSkip } from '@/hooks/useFlow';
import { useCreatePrediction } from '@/hooks/usePrediction';
import { FlowCard } from '@/components/flow/FlowCard';
import { FlowProgress } from '@/components/flow/FlowProgress';
import { FlowSummary } from '@/components/flow/FlowSummary';
import { trackEvent } from '@/lib/analytics';
import { useIsMobile } from '@/hooks/use-mobile';

export default function FlowPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const { data: feed, isLoading, isError, refetch } = useFlowFeed(20);
  const recordSkip = useRecordSkip();
  const createPrediction = useCreatePrediction();
  const flowSession = useFlowSession();
  const sessionIdRef = useRef<string | null>(null);

  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState({ answered: 0, skipped: 0, invested: 0, viewed: 0, streak: 0 });

  const cards = useMemo(() => feed ?? [], [feed]);
  const current = cards[index];
  const next = cards[index + 1];
  const isFinished = !isLoading && cards.length > 0 && index >= cards.length;
  const isEmpty = !isLoading && cards.length === 0;

  // Start session once feed loaded
  useEffect(() => {
    if (!user || !feed || sessionIdRef.current) return;
    void flowSession.start(isMobile ? 'mobile' : 'desktop').then((id) => {
      sessionIdRef.current = id;
    });
    void trackEvent({ event: 'page_view', properties: { mode: 'flow' } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, feed, isMobile]);

  // Count viewed
  useEffect(() => {
    if (current) setStats((s) => ({ ...s, viewed: Math.max(s.viewed, index + 1) }));
  }, [current, index]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        void flowSession.end(sessionIdRef.current, {
          cards_viewed: stats.viewed,
          cards_answered: stats.answered,
          cards_skipped: stats.skipped,
          total_credits_invested: stats.invested,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center">
          <Zap className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="mb-2 font-display text-2xl font-bold">Entre para jogar o Flow</h1>
          <p className="mb-6 text-muted-foreground">Responda mercados em sequência e suba no ranking.</p>
          <Button asChild size="lg"><Link to="/login">Entrar</Link></Button>
        </div>
      </div>
    );
  }

  const advance = () => setIndex((i) => i + 1);

  const handleAnswer = (optionId: string, credits: number) => {
    if (!current) return;
    if ((profile?.futra_credits ?? 0) < credits) {
      // Falta de saldo: pula como skip silencioso
      handleSkip();
      return;
    }
    createPrediction.mutate(
      { marketId: current.id, selectedOption: optionId, credits },
      {
        onSuccess: () => {
          setStats((s) => ({ ...s, answered: s.answered + 1, invested: s.invested + credits, streak: s.streak + 1 }));
          void trackEvent({
            event: 'prediction_placed',
            properties: { mode: 'flow', market_id: current.id, credits },
          });
          advance();
        },
        onError: () => {
          // erro já notifica via toast no hook
          advance();
        },
      },
    );
  };

  const handleSkip = () => {
    if (!current) return;
    void recordSkip.mutateAsync(current.id).catch(() => {});
    setStats((s) => ({ ...s, skipped: s.skipped + 1, streak: 0 }));
    advance();
  };

  const handleOpenDetails = () => {
    if (!current) return;
    navigate(`/market/${current.id}`);
  };

  const handleRestart = () => {
    setIndex(0);
    setStats({ answered: 0, skipped: 0, invested: 0, viewed: 0, streak: 0 });
    void refetch();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="FUTRA Flow — Responda mercados em sequência"
        description="O modo principal da FUTRA: descubra e responda mercados em formato de cards, um após o outro."
      />

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border/20 bg-background/70 px-3 py-2 backdrop-blur-md">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground">
          <Link to="/" aria-label="Sair do Flow"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-1 font-display text-xs font-bold uppercase tracking-wider">
          <Zap className="h-3.5 w-3.5 text-primary" /> Flow
        </div>
        <div className="font-display text-xs font-semibold tabular-nums text-foreground/80">
          {profile?.futra_credits != null ? `${profile.futra_credits.toLocaleString('pt-BR')}` : '—'}
          <span className="ml-0.5 text-[10px] text-muted-foreground">FC</span>
        </div>
      </header>

      <FlowProgress
        answered={stats.answered}
        skipped={stats.skipped}
        invested={stats.invested}
        remaining={Math.max(0, cards.length - index)}
        streak={stats.streak}
      />

      {/* Card stage */}
      <main className="relative flex flex-1 items-stretch justify-center px-3 pb-6 pt-2">
        <div className="relative w-full max-w-md" style={{ height: 'min(78vh, 640px)' }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {isError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="mb-4 text-muted-foreground">Não foi possível carregar o feed.</p>
              <Button onClick={() => refetch()}>Tentar novamente</Button>
            </div>
          )}
          {isEmpty && (
            <FlowSummary
              answered={stats.answered}
              skipped={stats.skipped}
              invested={stats.invested}
              onRestart={handleRestart}
            />
          )}
          {isFinished && (
            <FlowSummary
              answered={stats.answered}
              skipped={stats.skipped}
              invested={stats.invested}
              onRestart={handleRestart}
            />
          )}

          <AnimatePresence mode="popLayout">
            {!isFinished && next && (
              <FlowCard
                key={`next-${next.id}`}
                market={next}
                onAnswer={() => {}}
                onSkip={() => {}}
                onOpenDetails={() => {}}
                isTop={false}
              />
            )}
            {!isFinished && current && (
              <FlowCard
                key={`top-${current.id}`}
                market={current}
                onAnswer={handleAnswer}
                onSkip={handleSkip}
                onOpenDetails={handleOpenDetails}
                isSubmitting={createPrediction.isPending}
                isTop
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      <p className="hidden pb-4 text-center text-xs text-muted-foreground sm:block">
        Arraste → para SIM · ← para NÃO · ↑ para PULAR · Toque no card para detalhes
      </p>
    </div>
  );
}
