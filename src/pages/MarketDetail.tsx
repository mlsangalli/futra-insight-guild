import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { VoteBar } from '@/components/futra/VoteBar';
import { CategoryBadge } from '@/components/futra/CategoryBadge';
import { MarketCard } from '@/components/futra/MarketCard';
import { Button } from '@/components/ui/button';
import { Clock, Users, Coins, Shield, ExternalLink, CheckCircle } from 'lucide-react';
import { getMarketById, mockMarkets } from '@/data/mock-markets';
import { mockActivities } from '@/data/mock-users';
import { cn } from '@/lib/utils';

function formatNumber(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const market = getMarketById(id || '');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [credits, setCredits] = useState(100);
  const [confirmed, setConfirmed] = useState(false);

  if (!market) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Market not found.</p>
        </div>
      </Layout>
    );
  }

  const related = mockMarkets.filter(m => m.category === market.category && m.id !== market.id).slice(0, 3);
  const selectedOpt = market.options.find(o => o.id === selectedOption);
  const potentialReward = selectedOpt ? Math.round(credits * (100 / selectedOpt.percentage) * 0.85) : 0;

  const daysLeft = Math.max(0, Math.floor((new Date(market.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <CategoryBadge category={market.category} className="mb-3" />
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight">
                {market.question}
              </h1>
              <p className="text-muted-foreground mt-2">{market.description}</p>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" /> {formatNumber(market.totalParticipants)} participants
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Coins className="h-4 w-4" /> {formatNumber(market.totalCredits)} credits
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" /> {daysLeft} days left
              </span>
            </div>

            {/* Vote distribution */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground mb-4">Current distribution</h2>
              <VoteBar options={market.options} type={market.type} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                {market.options.map(opt => (
                  <div key={opt.id} className="p-3 rounded-lg bg-surface-800 text-center">
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatNumber(opt.votes)} votes · {formatNumber(opt.creditsAllocated)} credits</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution rules */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Resolution rules
              </h2>
              <p className="text-sm text-muted-foreground mb-3">{market.resolutionRules}</p>
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-3 w-3 text-primary" />
                <span className="text-primary">{market.resolutionSource}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Ends: {new Date(market.endDate).toLocaleDateString()}</p>
            </div>

            {/* Activity feed */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground mb-4">Recent activity</h2>
              <div className="space-y-3">
                {mockActivities.slice(0, 5).map(act => (
                  <div key={act.id} className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {act.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground font-medium">@{act.username}</span>
                      <span className="text-muted-foreground"> predicted </span>
                      <span className="text-emerald font-medium">{act.optionLabel}</span>
                      <span className="text-muted-foreground"> · {act.credits} credits</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Related markets */}
            {related.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-bold text-foreground mb-4">Related markets</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {related.map(m => <MarketCard key={m.id} market={m} />)}
                </div>
              </div>
            )}
          </div>

          {/* Participation panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-xl border border-border bg-card p-6 space-y-5">
              {confirmed ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-12 w-12 text-emerald mx-auto mb-3" />
                  <h3 className="font-display font-bold text-foreground text-lg">Prediction confirmed!</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    You picked <span className="text-emerald font-medium">{selectedOpt?.label}</span> with {credits} credits.
                  </p>
                  <Button className="mt-4 w-full" variant="outline" onClick={() => { setConfirmed(false); setSelectedOption(null); }}>
                    Make another prediction
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="font-display font-semibold text-foreground">Make your pick</h3>

                  {/* Option selection */}
                  <div className="space-y-2">
                    {market.options.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedOption(opt.id)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border transition-all text-sm',
                          selectedOption === opt.id
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{opt.label}</span>
                          <span>{opt.percentage}%</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Credit allocation */}
                  {selectedOption && (
                    <div className="space-y-3 animate-fade-in">
                      <div>
                        <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                          Allocate credits
                        </label>
                        <input
                          type="range"
                          min={10}
                          max={1000}
                          step={10}
                          value={credits}
                          onChange={e => setCredits(Number(e.target.value))}
                          className="w-full mt-2 accent-primary"
                        />
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-muted-foreground">10</span>
                          <span className="font-display font-bold text-foreground">{credits} FC</span>
                          <span className="text-muted-foreground">1000</span>
                        </div>
                      </div>

                      <div className="rounded-lg bg-surface-800 p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">You risk</span>
                          <span className="text-foreground font-medium">{credits} FC</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Potential reward</span>
                          <span className="text-emerald font-bold">{potentialReward} FC</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Resolution date</span>
                          <span className="text-foreground">{new Date(market.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full gradient-primary border-0"
                        onClick={() => setConfirmed(true)}
                      >
                        Confirm prediction
                      </Button>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground text-center">
                    <Link to="/login" className="text-primary hover:underline">Log in</Link> to make predictions
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
