import { Link } from 'react-router-dom';
import { ArrowLeft, Target, Trophy, Coins, CheckCircle2, Calendar } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { MissionsCard } from '@/components/futra/MissionsCard';
import { useMissionHistory, useMissionStats } from '@/hooks/useMissions';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function StatsBar() {
  const { data: stats, isLoading } = useMissionStats();

  const items = [
    { icon: CheckCircle2, label: 'Concluídas', value: stats?.totalCompleted ?? 0, color: 'text-emerald-400' },
    { icon: Coins, label: 'Créditos ganhos', value: `${stats?.totalCredits ?? 0} FC`, color: 'text-primary' },
    { icon: Trophy, label: 'Score ganho', value: stats?.totalScore ?? 0, color: 'text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(item => (
        <div key={item.label} className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2">
          <item.icon className={`h-5 w-5 ${item.color}`} />
          {isLoading ? (
            <Skeleton className="h-6 w-12" />
          ) : (
            <span className="text-lg font-bold text-foreground">{item.value}</span>
          )}
          <span className="text-xs text-muted-foreground text-center">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function MissionHistory() {
  const { data: history, isLoading } = useMissionHistory();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhuma missão resgatada ainda.</p>
        <p className="text-xs mt-1">Complete missões e resgate suas recompensas!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {history.map(item => (
        <div key={item.id} className="flex items-center gap-3 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="capitalize">{item.period === 'daily' ? 'Diária' : 'Semanal'}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(item.claimed_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-sm font-medium text-primary">+{item.reward_credits} FC</span>
            {item.reward_score > 0 && (
              <p className="text-xs text-amber-400">+{item.reward_score} score</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Missions() {
  return (
    <Layout>
      <SEO title="Missões | FUTRA" description="Complete missões diárias e semanais para ganhar créditos e score." />
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-700 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Missões
            </h1>
            <p className="text-sm text-muted-foreground">Complete desafios e ganhe recompensas</p>
          </div>
        </div>

        <StatsBar />

        <MissionsCard />

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-display text-sm font-bold text-foreground mb-3">Histórico de recompensas</h3>
          <MissionHistory />
        </div>
      </div>
    </Layout>
  );
}
