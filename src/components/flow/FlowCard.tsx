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
      initial={isTop ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 0, y: 0 }}
      animate={isTop ? { scale: 1, opacity: 1, y: 0 } : { scale: 1, opacity: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-border/40 bg-card shadow-2xl">
        {/* Decorative gradient overlay (non-transparent base above) */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface-800 to-surface-900" aria-hidden />
        {/* Swipe overlays */}
        {isTop && (
          <>
            <motion.div style={{ opacity: yesOpacity }} className="pointer-events-none absolute left-5 top-5 z-30 rotate-[-8deg] rounded-xl border-2 border-success/80 bg-success/15 px-4 py-1.5 backdrop-blur-md">
              <span className="font-display text-xl font-black tracking-wide text-success">SIM</span>
            </motion.div>
            <motion.div style={{ opacity: noOpacity }} className="pointer-events-none absolute right-5 top-5 z-30 rotate-[8deg] rounded-xl border-2 border-destructive/80 bg-destructive/15 px-4 py-1.5 backdrop-blur-md">
              <span className="font-display text-xl font-black tracking-wide text-destructive">NÃO</span>
            </motion.div>
            <motion.div style={{ opacity: skipOpacity }} className="pointer-events-none absolute left-1/2 top-10 z-30 -translate-x-1/2 rounded-xl border-2 border-muted-foreground/70 bg-muted/15 px-4 py-1.5 backdrop-blur-md">
              <span className="font-display text-base font-bold uppercase tracking-wider text-muted-foreground">Pular</span>
            </motion.div>
          </>
        )}

        {/* Image header — clickable for details */}
        <button
          type="button"
          onClick={onOpenDetails}
          aria-label="Ver detalhes"
          className="group relative block h-40 w-full shrink-0 overflow-hidden text-left"
        >
          {market.image_url ? (
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url(${market.image_url})` }}
              aria-label={market.image_alt || ''}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-surface-800 to-accent/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-surface-900/30 to-transparent" />

          {/* Floating meta over image */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <CategoryBadge category={market.category as any} />
            {market.flow_score > 80 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warning backdrop-blur">
                <Flame className="h-3 w-3" /> Hot
              </span>
            )}
          </div>
          <div className="absolute right-3 top-3">
            <CountdownTimer endDate={market.lock_date || market.end_date} />
          </div>
        </button>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
          {/* Question */}
          <h2
            onClick={onOpenDetails}
            className="cursor-pointer font-display text-xl font-bold leading-tight text-foreground transition hover:opacity-80 sm:text-[1.6rem] sm:leading-[1.15]"
          >
            {market.question}
          </h2>

          {/* Consensus + social, em uma linha unificada */}
          {leader && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-muted-foreground">
                  Consenso: <span className="font-semibold text-foreground">{leader.label}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span className="tabular-nums">{market.total_participants.toLocaleString('pt-BR')}</span>
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-surface-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  style={{ width: `${Math.max(2, Math.min(100, leader.percentage ?? 0))}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex-1" />

          {/* Aposta — compacto */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setCredits(amt)}
                  className={cn(
                    'flex-1 rounded-lg border px-2 py-1.5 font-display text-xs font-semibold tabular-nums transition',
                    credits === amt
                      ? 'border-primary bg-primary/10 text-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.15)]'
                      : 'border-border/40 text-muted-foreground hover:border-border/80 hover:text-foreground',
                  )}
                >
                  {amt}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            {isBinary && yesOption && noOption ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="lg"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => onAnswer(noOption.id, credits)}
                  className="h-14 border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="mr-1.5 h-5 w-5" />
                  <span className="font-display text-base font-bold">NÃO</span>
                </Button>
                <Button
                  size="lg"
                  disabled={isSubmitting}
                  onClick={() => onAnswer(yesOption.id, credits)}
                  className="h-14 bg-success text-success-foreground hover:bg-success/90"
                >
                  <Check className="mr-1.5 h-5 w-5" />
                  <span className="font-display text-base font-bold">SIM</span>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
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
                    <span className="text-xs text-muted-foreground tabular-nums">{Math.round(opt.percentage ?? 0)}%</span>
                  </Button>
                ))}
              </div>
            )}

            {/* Footer minimalista */}
            <div className="flex items-center justify-center pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                disabled={isSubmitting}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> Pular este
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
