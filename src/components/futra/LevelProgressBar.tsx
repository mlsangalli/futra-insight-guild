import { InfluenceBadge } from '@/components/futra/InfluenceBadge';
import { Progress } from '@/components/ui/progress';
import { InfluenceLevel, INFLUENCE_THRESHOLDS, INFLUENCE_ORDER } from '@/types';

interface LevelProgressBarProps {
  score: number;
  influenceLevel: InfluenceLevel;
}

export function LevelProgressBar({ score, influenceLevel }: LevelProgressBarProps) {
  const current = INFLUENCE_THRESHOLDS[influenceLevel];
  const currentIdx = INFLUENCE_ORDER.indexOf(influenceLevel);
  const isMax = influenceLevel === 'elite';

  const nextLevel = isMax ? null : INFLUENCE_ORDER[currentIdx + 1];
  const nextThreshold = nextLevel ? INFLUENCE_THRESHOLDS[nextLevel] : null;

  const rangeMin = current.min;
  const rangeMax = nextThreshold ? nextThreshold.min : current.min;
  const progress = isMax ? 100 : Math.min(100, Math.max(0, ((score - rangeMin) / (rangeMax - rangeMin)) * 100));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <InfluenceBadge level={influenceLevel} />
          <span className="text-sm text-muted-foreground">Score: {score}</span>
        </div>
        {isMax ? (
          <span className="text-xs text-muted-foreground">Nível máximo</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {score} / {rangeMax} para {current.nextLabel}
          </span>
        )}
      </div>
      <Progress value={progress} className="h-2" />
      {!isMax && (
        <p className="text-xs text-muted-foreground mt-2">
          Faltam {rangeMax - score} pontos para {current.nextLabel}
        </p>
      )}
    </div>
  );
}
