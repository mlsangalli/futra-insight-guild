import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { VoteBar } from '@/components/futra/VoteBar';
import { CategoryBadge } from '@/components/futra/CategoryBadge';
import { Button } from '@/components/ui/button';
import { Clock, Users, Coins, Shield, ExternalLink, CheckCircle, Loader2, FileQuestion } from 'lucide-react';
import { useMarket } from '@/hooks/useMarkets';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/futra/Skeletons';

function formatNumber(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}

function MarketDetailSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="lg:col-span-1">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: market, isLoading, isError, refetch } = useMarket(id || '');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [credits, setCredits] = useState(100);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  if (isLoading) {
    return <Layout><div className="container mx-auto px-4 py-8"><MarketDetailSkeleton /></div></Layout>;
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

  const selectedOpt = market.options.find(o => o.id === selectedOption);
  const potentialReward = selectedOpt ? Math.round(credits * (100 / selectedOpt.percentage) * 0.85) : 0;
  const daysLeft = Math.max(0, Math.floor((new Date(market.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const handleConfirm = async () => {
    if (!user || !selectedOption) return;
    setSubmitting(true);
    const { error } = await supabase.rpc('place_prediction', {
      p_market_id: market.id,
      p_selected_option: selectedOption,
      p_credits: credits,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      setConfirmed(true);
      toast.success('Prediction confirmed!');
      queryClient.invalidateQueries({ queryKey: ['market', id] });
      refreshProfile();
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <CategoryBadge category={market.category as any} className="mb-3" />
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight">{market.question}</h1>
              <p className="text-muted-foreground mt-2">{market.description}</p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-4 w-4" /> {formatNumber(market.total_participants)} participants</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><Coins className="h-4 w-4" /> {formatNumber(market.total_credits)} credits</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4" /> {daysLeft} days left</span>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground mb-4">Current distribution</h2>
              <VoteBar options={market.options} type={market.type as any} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                {market.options.map(opt => (
                  <div key={opt.id} className="p-3 rounded-lg bg-surface-800 text-center">
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatNumber(opt.votes)} votes · {formatNumber(opt.creditsAllocated)} credits</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Resolution rules</h2>
              <p className="text-sm text-muted-foreground mb-3">{market.resolution_rules}</p>
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-3 w-3 text-primary" />
                <span className="text-primary">{market.resolution_source}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Ends: {new Date(market.end_date).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Participation panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-xl border border-border bg-card p-6 space-y-5">
              {confirmed ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-12 w-12 text-emerald mx-auto mb-3" />
                  <h3 className="font-display font-bold text-foreground text-lg">Prediction confirmed!</h3>
                  <p className="text-sm text-muted-foreground mt-2">You picked <span className="text-emerald font-medium">{selectedOpt?.label}</span> with {credits} credits.</p>
                  <Button className="mt-4 w-full" variant="outline" onClick={() => { setConfirmed(false); setSelectedOption(null); }}>Make another prediction</Button>
                </div>
              ) : (
                <>
                  <h3 className="font-display font-semibold text-foreground">Make your pick</h3>
                  <div className="space-y-2">
                    {market.options.map(opt => (
                      <button key={opt.id} onClick={() => setSelectedOption(opt.id)} className={cn('w-full text-left p-3 rounded-lg border transition-all text-sm', selectedOption === opt.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground')}>
                        <div className="flex justify-between"><span className="font-medium">{opt.label}</span><span>{opt.percentage}%</span></div>
                      </button>
                    ))}
                  </div>

                  {selectedOption && (
                    <div className="space-y-3 animate-fade-in">
                      <div>
                        <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Allocate credits</label>
                        <input type="range" min={10} max={Math.min(1000, profile?.futra_credits || 1000)} step={10} value={credits} onChange={e => setCredits(Number(e.target.value))} className="w-full mt-2 accent-primary" />
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-muted-foreground">10</span>
                          <span className="font-display font-bold text-foreground">{credits} FC</span>
                          <span className="text-muted-foreground">{Math.min(1000, profile?.futra_credits || 1000)}</span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-surface-800 p-4 space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">You risk</span><span className="text-foreground font-medium">{credits} FC</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Potential reward</span><span className="text-emerald font-bold">{potentialReward} FC</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Your balance</span><span className="text-foreground">{profile?.futra_credits?.toLocaleString() || '—'} FC</span></div>
                      </div>
                      {user ? (
                        <Button className="w-full gradient-primary border-0" onClick={handleConfirm} disabled={submitting}>
                          {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Confirming...</> : 'Confirm prediction'}
                        </Button>
                      ) : (
                        <Button className="w-full gradient-primary border-0" asChild>
                          <Link to="/login">Log in to predict</Link>
                        </Button>
                      )}
                    </div>
                  )}

                  {!user && (
                    <p className="text-xs text-muted-foreground text-center">
                      <Link to="/login" className="text-primary hover:underline">Log in</Link> to make predictions
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
