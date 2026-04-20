import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Target, Coins, ArrowRight, Check } from '@/lib/icons';
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
      toast.error('Falha ao salvar preferências');
      return;
    }
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
    toast.success('Bem-vindo à FUTRA! 🎉');
    navigate('/');
  };

  if (profile?.onboarding_completed) {
    return <Navigate to="/" replace />;
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
                <h2 className="font-display text-xl font-bold text-foreground">Bem-vindo à FUTRA</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  A plataforma social de previsões onde suas apostas constroem reputação. Faça previsões, ganhe créditos, suba no ranking.
                </p>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Escolha seus interesses</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Escolha categorias que deseja acompanhar. Você pode mudar depois.
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
                <h2 className="font-display text-xl font-bold text-foreground">Tudo pronto!</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Você começa com <span className="text-emerald font-bold">1.000 Futra Credits</span> para fazer suas primeiras previsões.
                </p>
              </div>
              <div className="rounded-lg bg-surface-800 p-4">
                <p className="text-3xl font-display font-bold text-emerald glow-text-emerald">
                  1.000 FC
                </p>
                <p className="text-xs text-muted-foreground mt-1">Seu saldo inicial</p>
              </div>
            </>
          )}

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
                Voltar
              </Button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <Button className="flex-1 gradient-primary border-0" onClick={() => setStep(step + 1)}>
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="flex-1 gradient-primary border-0"
                onClick={completeOnboarding}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Começar a explorar'} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
