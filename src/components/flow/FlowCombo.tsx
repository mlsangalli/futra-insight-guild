import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface FlowComboProps {
  streak: number;
  className?: string;
}

/**
 * Indicador de combo/streak — micro-recompensa visual entre respostas.
 * Cresce em intensidade conforme o usuário responde sem pular.
 */
export function FlowCombo({ streak, className }: FlowComboProps) {
  if (streak < 2) return null;

  const tier =
    streak >= 10 ? { label: 'LENDÁRIO', color: 'from-warning via-destructive to-warning', icon: Flame, glow: true } :
    streak >= 5  ? { label: 'EM CHAMAS', color: 'from-primary via-accent to-warning', icon: Flame, glow: true } :
    streak >= 3  ? { label: 'COMBO', color: 'from-primary to-accent', icon: Zap, glow: false } :
                   { label: 'SEQUÊNCIA', color: 'from-primary/80 to-accent/80', icon: Zap, glow: false };

  const Icon = tier.icon;

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={streak}
        initial={{ scale: 0.6, opacity: 0, y: -4 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-2.5 py-0.5 text-[10px] font-display font-bold uppercase tracking-wider text-background',
          tier.color,
          tier.glow && 'shadow-[0_0_20px_hsl(var(--primary)/0.5)]',
          className,
        )}
      >
        <Icon className={cn('h-3 w-3', tier.glow && 'animate-pulse')} />
        <span>×{streak}</span>
        <span className="hidden sm:inline">· {tier.label}</span>
      </motion.div>
    </AnimatePresence>
  );
}
