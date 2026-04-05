import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Target, Coins, TrendingUp, Trophy, ArrowRight } from 'lucide-react';

const STEPS = [
  { icon: Target, title: 'Choose your side', desc: 'Browse markets and pick Yes, No, or your favorite option. No percentages needed — just your conviction.' },
  { icon: Coins, title: 'Allocate Futra Credits', desc: 'Back your prediction with credits. The more you risk, the more you can earn. But be strategic.' },
  { icon: TrendingUp, title: 'Earn when you\'re right', desc: 'Correct predictions earn credits. Bonus rewards for calling unpopular outcomes that turn out right.' },
  { icon: Trophy, title: 'Build your reputation', desc: 'Climb the leaderboard, unlock Elite status, earn badges, and gain influence in the community.' },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-2xl font-bold gradient-primary-text mb-12">FUTRA</h1>

        <div className="rounded-xl border border-border bg-card p-8 space-y-6">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto">
            <current.icon className="h-8 w-8 text-primary-foreground" />
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-foreground">{current.title}</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{current.desc}</p>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button className="flex-1 gradient-primary border-0" onClick={() => setStep(step + 1)}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button className="flex-1 gradient-primary border-0" asChild>
                <Link to="/browse">Start exploring <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            )}
          </div>
        </div>

        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground mt-6 inline-block">
          Skip for now
        </Link>
      </div>
    </div>
  );
}
