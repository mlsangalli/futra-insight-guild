import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Target, Coins, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CATEGORIES } from '@/types';

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const toggleCategory = (key: string) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const completeOnboarding = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        specialties: selectedCategories,
      })
      .eq('user_id', user.id);
    if (error) {
      setSaving(false);
      toast.error('Failed to save preferences');
      return;
    }
    // Apply referral if present
    const refCode = localStorage.getItem('futra_ref');
    if (refCode) {
      try {
        await supabase.functions.invoke('apply-referral', {
          body: { referral_code: refCode },
        });
        localStorage.removeItem('futra_ref');
      } catch {
        // Non-blocking
      }
    }
    setSaving(false);
    await refreshProfile();
    toast.success('Welcome to FUTRA! 🎉');
    navigate('/');
  };

  // If onboarding already completed, redirect
  if (profile?.onboarding_completed) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-2xl font-bold gradient-primary-text mb-10">FUTRA</h1>

        <div className="rounded-xl border border-border bg-card p-8 space-y-6">
          {step === 0 && (
            <>
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto">
                <Target className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Welcome to FUTRA</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  The social forecasting platform where your predictions build reputation. Make calls, earn credits, climb the leaderboard.
                </p>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Pick your interests</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Choose categories you'd like to follow. You can change this later.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.key);
                  return (
                    <button
                      key={cat.key}
                      onClick={() => toggleCategory(cat.key)}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-lg border text-left transition-all text-sm',
                        isSelected
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span className="text-lg">{cat.emoji}</span>
                      <span className="font-medium">{cat.label}</span>
                      {isSelected && <Check className="h-4 w-4 text-primary ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto">
                <Coins className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">You're all set!</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  You start with <span className="text-emerald font-bold">1,000 Futra Credits</span> to make your first predictions.
                </p>
              </div>
              <div className="rounded-lg bg-surface-800 p-4">
                <p className="text-3xl font-display font-bold text-emerald glow-text-emerald">
                  1,000 FC
                </p>
                <p className="text-xs text-muted-foreground mt-1">Your starting balance</p>
              </div>
            </>
          )}

          {/* Step dots */}
          <div className="flex justify-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  i === step ? 'bg-primary' : i < step ? 'bg-primary/50' : 'bg-muted'
                )}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <Button className="flex-1 gradient-primary border-0" onClick={() => setStep(step + 1)}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="flex-1 gradient-primary border-0"
                onClick={completeOnboarding}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Start exploring'} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
