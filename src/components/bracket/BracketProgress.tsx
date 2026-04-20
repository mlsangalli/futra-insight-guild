import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { BRACKET_STEPS, type BracketStep } from '@/types/bracket';
import { Check } from '@/lib/icons';

interface BracketProgressProps {
  currentStep: BracketStep;
  progress: number;
  onStepClick: (step: BracketStep) => void;
}

export function BracketProgress({ currentStep, progress, onStepClick }: BracketProgressProps) {
  const currentIndex = BRACKET_STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Progresso</h2>
        <span className="text-sm font-bold text-primary">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />

      <div className="flex items-center justify-between gap-2">
        {BRACKET_STEPS.map((step, idx) => {
          const isActive = step.key === currentStep;
          const isPast = idx < currentIndex;

          return (
            <button
              key={step.key}
              onClick={() => onStepClick(step.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center',
                isActive && 'bg-primary/15 text-primary border border-primary/30',
                isPast && !isActive && 'text-accent',
                !isActive && !isPast && 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              {isPast && !isActive && <Check className="h-3 w-3" />}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.label.slice(0, 3)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
