import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { InfluenceBadge } from '@/components/futra/InfluenceBadge';
import { CategoryBadge } from '@/components/futra/CategoryBadge';
import { StatCard } from '@/components/futra/StatCard';
import { useProfile } from '@/hooks/useMarkets';
import { usePublicPredictions } from '@/hooks/useProfilePredictions';
import { useAuth } from '@/contexts/AuthContext';
import { Target, Coins, Trophy, Zap, UserX, Share2, CheckCircle, XCircle } from 'lucide-react';
import { MarketCategory } from '@/types';
import { ProfileSkeleton, ErrorState, EmptyState } from '@/components/futra/Skeletons';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import EditProfileDialog from '@/components/EditProfileDialog';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { data: user, isLoading, isError, refetch } = useProfile(username || '');
  const { user: currentUser } = useAuth();
  const isOwn = !!currentUser && !!user && currentUser.id === user.user_id;
  const { data: predictions } = usePublicPredictions(user?.user_id);

  const handleShareProfile = async () => {
    const text = `Meu perfil na FUTRA:\n🏆 Rank #${user?.global_rank}\n⭐ Score: ${user?.futra_score}\n🎯 Precisão: ${Math.round(user?.accuracy_rate || 0)}%\n\nVeja meu histórico de previsões:`;
    const url = `${window.location.origin}/profile/${username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${user?.display_name} na FUTRA`, text, url });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(`${text}\n${url}`);
    toast.success('Link do perfil copiado!');
  };

  if (isLoading) return <Layout><div className="container mx-auto px-4 py-8"><ProfileSkeleton /></div></Layout>;
  if (isError) return <Layout><div className="container mx-auto px-4 py-8"><ErrorState onRetry={() => refetch()} /></div></Layout>;

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            icon={<UserX className="h-10 w-10 text-muted-foreground" />}
            title="Usuário não encontrado"
            description={`O perfil @${username} não existe ou foi removido.`}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title={`${user.display_name} (@${user.username})`} description={`${user.display_name} — Futra Score: ${user.futra_score} · Precisão: ${user.accuracy_rate}%`} />
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-xl border border-border bg-card p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shrink-0">
              {user.display_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-2xl font-bold text-foreground">{user.display_name}</h1>
                <InfluenceBadge level={user.influence_level} />
              </div>
              <p className="text-muted-foreground text-sm">@{user.username}</p>
              <p className="text-secondary-foreground mt-2">{user.bio}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {(user.specialties || []).map((s: string) => (
                  <CategoryBadge key={s} category={s as MarketCategory} />
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Ranking Global</p>
                <p className="font-display text-3xl font-bold text-foreground">#{user.global_rank || '—'}</p>
              </div>
              {isOwn ? (
                <EditProfileDialog />
              ) : (
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Share2 className="h-4 w-4 mr-1" /> Compartilhar
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <StatCard label="Futra Score" value={user.futra_score} icon={Trophy} />
          <StatCard label="Futra Credits" value={(user.futra_credits || 0).toLocaleString()} icon={Coins} />
          <StatCard label="Precisão" value={`${user.accuracy_rate}%`} icon={Target} />
          <StatCard label="Sequência" value={user.streak} icon={Zap} />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground mb-4">Histórico de previsões</h2>
            {predictions && predictions.length > 0 ? (
              <div className="space-y-3">
                {predictions.map((p: any) => (
                  <Link key={p.id} to={`/market/${p.market_id}`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-800/50 transition-colors">
                    {p.status === 'won'
                      ? <CheckCircle className="h-4 w-4 text-emerald shrink-0 mt-0.5" />
                      : <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{p.markets?.question || 'Mercado'}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        <span>{p.credits_allocated} FC apostados</span>
                        {p.reward > 0 && <span className="text-emerald">+{p.reward} FC</span>}
                        <span>{new Date(p.updated_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total de previsões</span><span className="text-foreground font-medium">{user.total_predictions}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Resolvidas</span><span className="text-foreground font-medium">{user.resolved_predictions}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pendentes</span><span className="text-foreground font-medium">{user.total_predictions - user.resolved_predictions}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxa de acerto</span><span className="text-emerald font-medium">{user.accuracy_rate}%</span></div>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold text-foreground mb-4">Sobre</h2>
            <p className="text-sm text-muted-foreground">{user.bio || 'Sem bio ainda.'}</p>
            <p className="text-xs text-muted-foreground mt-4">Entrou em {new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
