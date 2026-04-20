import { useMemo, useState } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Check, X, ArrowUpRight, Users, Coins, Zap, Flame } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/futra/CategoryBadge';
import { CountdownTimer } from '@/components/futra/CountdownTimer';
import { cn } from '@/lib/utils';
import type { FlowMarket } from '@/hooks/useFlow';

interface FlowCardProps {
  market: FlowMarket;
  onAnswer: (optionId: string, credits: number) => void;
  onSkip: () => void;
  onOpenDetails: () => void;
  isSubmitting?: boolean;
  isTop?: boolean;
}

const QUICK_AMOUNTS = [50, 100, 250, 500];

export function FlowCard({ market, onAnswer, onSkip, onOpenDetails, isSubmitting, isTop = false }: FlowCardProps) {
  const [credits, setCredits] = useState(100);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
  const yesOpacity = useTransform(x, [20, 120], [0, 1]);
  const noOpacity = useTransform(x, [-120, -20], [1, 0]);
  const skipOpacity = useTransform(y, [-120, -20], [1, 0]);

  const sortedOptions = useMemo(
    () => [...(market.options || [])].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0)),
    [market.options],
  );
  const isBinary = sortedOptions.length === 2;
  const yesOption = isBinary ? sortedOptions.find((o) => /sim|yes/i.test(o.label)) ?? sortedOptions[0] : null;
  const noOption = isBinary ? sortedOptions.find((o) => /n[ãa]o|no/i.test(o.label)) ?? sortedOptions[1] : null;
  const leader = sortedOptions[0];

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (isSubmitting) return;
    const { offset, velocity } = info;
    if (offset.y < -120 || velocity.y < -500) {
      onSkip();
      return;
    }
    if (isBinary && yesOption && noOption) {
      if (offset.x > 140 || velocity.x > 600) {
        onAnswer(yesOption.id, credits);
        return;
      }
      if (offset.x < -140 || velocity.x < -600) {
        onAnswer(noOption.id, credits);
        return;
      }
    }
  };

  return (
    <motion.div
      className={cn(
        'absolute inset-0 mx-auto max-w-md select-none',
        isTop ? 'z-20' : 'z-10 pointer-events-none',
      )}
      style={isTop ? { x, y, rotate } : undefined}
      drag={isTop && !isSubmitting ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      initial={isTop ? { scale: 1, opacity: 1 } : { scale: 0.94, opacity: 0.7, y: 16 }}
      animate={isTop ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.94, opacity: 0.7, y: 16 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-b from-surface-800 to-surface-900 shadow-2xl">
        {/* Swipe overlays */}
        {isTop && (
          <>
            <motion.div style={{ opacity: yesOpacity }} className="pointer-events-none absolute left-6 top-6 z-30 rounded-lg border-2 border-success/70 bg-success/10 px-4 py-2 backdrop-blur">
              <span className="font-display text-2xl font-bold text-success">SIM ✓</span>
            </motion.div>
            <motion.div style={{ opacity: noOpacity }} className="pointer-events-none absolute right-6 top-6 z-30 rounded-lg border-2 border-destructive/70 bg-destructive/10 px-4 py-2 backdrop-blur">
              <span className="font-display text-2xl font-bold text-destructive">NÃO ✗</span>
            </motion.div>
            <motion.div style={{ opacity: skipOpacity }} className="pointer-events-none absolute left-1/2 top-12 z-30 -translate-x-1/2 rounded-lg border-2 border-muted-foreground/70 bg-muted/10 px-4 py-2 backdrop-blur">
              <span className="font-display text-lg font-bold text-muted-foreground">PULAR ⤴</span>
            </motion.div>
          </>
        )}

        {/* Image header */}
        {market.image_url ? (
          <div
            className="relative h-44 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${market.image_url})` }}
            aria-label={market.image_alt || ''}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-surface-900/40 to-transparent" />
          </div>
        ) : (
          <div className="relative h-32 w-full bg-gradient-to-br from-primary/20 via-surface-800 to-accent/20">
            <div className="absolute inset-0 bg-gradient-to-t from-surface-900 to-transparent" />
          </div>
        )}

        <div className="flex h-[calc(100%-11rem)] flex-col gap-3 p-5">
          {/* Meta */}
          <div className="flex items-center justify-between gap-2">
            <CategoryBadge category={market.category as any} />
            <CountdownTimer endDate={market.lock_date || market.end_date} />
          </div>

          {/* Question */}
          <button
            onClick={onOpenDetails}
            className="text-left transition hover:opacity-90"
            aria-label="Ver detalhes do mercado"
          >
            <h2 className="font-display text-xl font-bold leading-tight text-foreground sm:text-2xl">
              {market.question}
            </h2>
          </button>

          {/* Consensus bar */}
          {leader && (
            <div className="rounded-lg border border-border/40 bg-surface-900/70 p-3">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Consenso atual</span>
                <span className="font-display font-semibold text-foreground">
                  {leader.label} · {Math.round(leader.percentage ?? 0)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                  style={{ width: `${Math.max(2, Math.min(100, leader.percentage ?? 0))}%` }}
                />
              </div>
            </div>
          )}

          {/* Social */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {market.total_participants.toLocaleString('pt-BR')}</span>
            <span className="inline-flex items-center gap-1"><Coins className="h-3.5 w-3.5" /> {market.total_credits.toLocaleString('pt-BR')} FC</span>
            {market.flow_score > 80 && (
              <span className="inline-flex items-center gap-1 text-warning"><Flame className="h-3.5 w-3.5" /> Quente</span>
            )}
          </div>

          {/* Credits picker */}
          <div className="mt-auto space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Aposta</span>
              <span className="font-display text-lg font-bold text-foreground">{credits} FC</span>
            </div>
            <div className="flex gap-1.5">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setCredits(amt)}
                  className={cn(
                    'flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition',
                    credits === amt
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground',
                  )}
                >
                  {amt}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            {isBinary && yesOption && noOption ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  size="lg"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => onAnswer(noOption.id, credits)}
                  className="h-14 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="mr-1 h-5 w-5" />
                  <span className="font-display font-semibold">NÃO</span>
                </Button>
                <Button
                  size="lg"
                  disabled={isSubmitting}
                  onClick={() => onAnswer(yesOption.id, credits)}
                  className="h-14 bg-success text-success-foreground hover:bg-success/90"
                >
                  <Check className="mr-1 h-5 w-5" />
                  <span className="font-display font-semibold">SIM</span>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 pt-1">
                {sortedOptions.slice(0, 4).map((opt) => (
                  <Button
                    key={opt.id}
                    size="lg"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => onAnswer(opt.id, credits)}
                    className="h-12 justify-between border-border/40 text-left"
                  >
                    <span className="truncate">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{Math.round(opt.percentage ?? 0)}%</span>
                  </Button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={onSkip} disabled={isSubmitting} className="text-muted-foreground">
                <ArrowUpRight className="mr-1 h-4 w-4" /> Pular
              </Button>
              <Button variant="ghost" size="sm" onClick={onOpenDetails} className="text-muted-foreground">
                <Zap className="mr-1 h-4 w-4" /> Detalhes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
