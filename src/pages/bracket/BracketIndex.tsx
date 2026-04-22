import { Link } from 'react-router-dom';
import { Trophy, ArrowRight, Calendar } from '@/lib/icons';
import { useTournaments } from '@/hooks/useTournament';
import { PageLoader } from '@/components/PageLoader';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import { Layout } from '@/components/layout/Layout';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

export default function BracketIndex() {
  const { data: tournaments, isLoading } = useTournaments();

  if (isLoading) return <PageLoader />;

  return (
    <Layout>
      <SEO title="FUTRA Bracket" description="Preveja o campeão da Copa do Mundo 2026" />

      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
            <Trophy className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">FUTRA Bracket</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Monte seu bracket completo da Copa do Mundo. Preveja grupos, mata-mata e o campeão!
          </p>
        </div>

        <div className="grid gap-4">
          {(tournaments ?? []).map(t => (
            <Link
              key={t.id}
              to={`/bracket/${t.slug}`}
              className="group flex items-center gap-4 p-6 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold group-hover:text-primary transition-colors">{t.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{t.status}</span>
                  {t.deadline && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Deadline: {format(new Date(t.deadline), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          ))}

          {(!tournaments || tournaments.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum torneio disponível no momento.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
