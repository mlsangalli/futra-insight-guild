import { useState, useEffect } from 'react';
import { Clock } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  endDate: string;
  className?: string;
}

function computeTimeLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months}mo left`;
  }
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function CountdownTimer({ endDate, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(endDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(computeTimeLeft(endDate));
    }, 60_000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <span className={cn('inline-flex items-center gap-1 font-display text-xs text-muted-foreground', className)}>
      <Clock className="h-3 w-3" />
      {timeLeft}
    </span>
  );
}
