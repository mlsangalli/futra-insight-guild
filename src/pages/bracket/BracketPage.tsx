import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTournamentBySlug } from '@/hooks/useTournament';
import { useBracketEntry } from '@/hooks/useBracketEntry';
import { useAuth } from '@/contexts/AuthContext';
import { BracketProgress } from '@/components/bracket/BracketProgress';
import { GroupStage } from './GroupStage';
import { ThirdPlacePicker } from './ThirdPlacePicker';
import { KnockoutBracket } from './KnockoutBracket';
import { BracketSummary } from './BracketSummary';
import { PageLoader } from '@/components/PageLoader';
import { Button } from '@/components/ui/button';
import { Trophy, ArrowLeft, ArrowRight, LogIn } from 'lucide-react';
import { SEO } from '@/components/SEO';
import type { BracketStep } from '@/types/bracket';
import { BRACKET_STEPS } from '@/types/bracket';
import { Layout } from '@/components/layout/Layout';

export default function BracketPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { data: tournament, isLoading: tLoading } = useTournamentBySlug(slug || 'copa-2026');

  const {
    entry, loading, localState, groups, matches, progress, champion,
    resolveSource, setGroupOrder, setThirdPlaceQualifiers, setKnockoutPick,
    submitEntry, resetEntry,
  } = useBracketEntry(tournament?.id);

  const [step, setStep] = useState<BracketStep>('groups');

  if (tLoading || loading) return <PageLoader />;
  if (!tournament) return <Navigate to="/bracket" replace />;

  const isLocked = tournament.status === 'locked' || tournament.status === 'scored';
  const stepIndex = BRACKET_STEPS.findIndex(s => s.key === step);

  const nextStep = () => {
    // Auto-confirm unset groups when leaving the groups step
    if (step === 'groups' && groups) {
      groups.forEach(g => {
        const picks = localState.groupPicks[g.id];
        if (!picks || picks.length !== 4) {
          const defaultOrder = [...g.teams].sort((a, b) => a.seed_position - b.seed_position);
          setGroupOrder(g.id, defaultOrder.map(t => t.id));
        }
      });
    }

    if (stepIndex < BRACKET_STEPS.length - 1) {
      setStep(BRACKET_STEPS[stepIndex + 1].key);
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      setStep(BRACKET_STEPS[stepIndex - 1].key);
    }
  };

  return (
    <Layout>
      <SEO title={`Bracket — ${tournament.name}`} description="Preveja o caminho completo da Copa do Mundo 2026" />

      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{tournament.name}</h1>
              <p className="text-xs text-muted-foreground">
                {isLocked ? 'Bracket bloqueado' : 'Monte seu bracket'}
              </p>
            </div>
          </div>

          {entry && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-secondary text-muted-foreground font-medium">
              {entry.status === 'submitted' ? '✅ Enviado' : '📝 Rascunho'}
            </span>
          )}
        </div>

        {/* Not logged in */}
        {!user && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
            <Trophy className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-lg font-bold">Faça login para criar seu bracket</h2>
            <p className="text-sm text-muted-foreground">
              Preveja o caminho completo da Copa do Mundo 2026 e dispute o ranking!
            </p>
            <Button asChild className="gradient-primary border-0">
              <Link to="/login"><LogIn className="h-4 w-4 mr-2" /> Entrar</Link>
            </Button>
          </div>
        )}

        {/* Logged in: show bracket */}
        {user && entry && groups && matches && (
          <>
            <BracketProgress
              currentStep={step}
              progress={progress}
              onStepClick={setStep}
            />

            <div className="min-h-[400px]">
              {step === 'groups' && (
                <GroupStage
                  groups={groups}
                  localState={localState}
                  setGroupOrder={setGroupOrder}
                  disabled={isLocked}
                />
              )}

              {step === 'thirds' && (
                <ThirdPlacePicker
                  groups={groups}
                  localState={localState}
                  setThirdPlaceQualifiers={setThirdPlaceQualifiers}
                  disabled={isLocked}
                />
              )}

              {step === 'knockout' && (
                <KnockoutBracket
                  matches={matches}
                  groups={groups}
                  localState={localState}
                  resolveSource={resolveSource}
                  setKnockoutPick={setKnockoutPick}
                  disabled={isLocked}
                />
              )}

              {step === 'summary' && (
                <BracketSummary
                  entry={entry}
                  champion={champion}
                  progress={progress}
                  groups={groups}
                  localState={localState}
                  resolveSource={resolveSource}
                  onSubmit={submitEntry}
                  onReset={resetEntry}
                />
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={stepIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
              </Button>

              <span className="text-xs text-muted-foreground">
                {BRACKET_STEPS[stepIndex].label} — {BRACKET_STEPS[stepIndex].description}
              </span>

              <Button
                onClick={nextStep}
                disabled={stepIndex === BRACKET_STEPS.length - 1}
                className="gradient-primary border-0"
              >
                Próximo <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
