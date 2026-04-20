import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { useNotifications, useMarkAsRead } from '@/hooks/useNotifications';
import {
  Bell, Trophy, Coins, Target, Clock, CheckCheck,
  TrendingUp, Eye, Star, Award, Zap, ArrowUpRight,
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

// ── Type → visual mapping ─────────────────────────────────────
const typeConfig: Record<string, { icon: any; color: string; priority: number }> = {
  credits_won:         { icon: Coins,      color: 'text-emerald',    priority: 1 },
  rank_up:             { icon: TrendingUp, color: 'text-primary',    priority: 2 },
  achievement_unlocked:{ icon: Award,      color: 'text-amber-400',  priority: 2 },
  mission_complete:    { icon: Star,       color: 'text-amber-400',  priority: 3 },
  market_lock_soon:    { icon: Clock,      color: 'text-orange-400', priority: 3 },
  watchlist_movement:  { icon: Eye,        color: 'text-primary',    priority: 4 },
  credits_lost:        { icon: Coins,      color: 'text-destructive',priority: 4 },
  new_category_market: { icon: Zap,        color: 'text-primary',    priority: 5 },
  market_resolved:     { icon: Target,     color: 'text-emerald',    priority: 3 },
  level_up:            { icon: Trophy,     color: 'text-primary',    priority: 2 },
  streak_milestone:    { icon: Trophy,     color: 'text-amber-400',  priority: 3 },
  system:              { icon: Bell,       color: 'text-muted-foreground', priority: 6 },
  new_market:          { icon: Clock,      color: 'text-primary',    priority: 5 },
};

function getNotifLink(n: any): string | null {
  if (n.data?.market_id) return `/market/${n.data.market_id}`;
  if (n.data?.achievement_id) return '/dashboard';
  return null;
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();

  return (
    <Layout>
      <SEO title="Notificações" description="Suas notificações na FUTRA." />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl font-bold text-foreground">Notificações</h1>
          {notifications.some((n: any) => !n.read) && (
            <Button variant="ghost" size="sm" onClick={() => markAsRead.mutate(undefined)}>
              <CheckCheck className="h-4 w-4 mr-1" /> Marcar todas como lidas
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma notificação ainda.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {notifications.map((n: any) => {
              const config = typeConfig[n.type] || typeConfig.system;
              const Icon = config.icon;
              const link = getNotifLink(n);

              const content = (
                <div className={cn(
                  'flex gap-4 p-4 transition-colors',
                  !n.read && 'bg-primary/[0.03]',
                  link && 'hover:bg-muted/50 cursor-pointer'
                )}>
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    !n.read ? 'bg-primary/10' : 'bg-muted/30'
                  )}>
                    <Icon className={cn('h-4 w-4', !n.read ? config.color : 'text-muted-foreground')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm font-medium', !n.read ? 'text-foreground' : 'text-muted-foreground')}>
                        {n.title}
                      </p>
                      {link && <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                </div>
              );

              return link ? (
                <Link key={n.id} to={link} onClick={() => !n.read && markAsRead.mutate([n.id])}>
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
