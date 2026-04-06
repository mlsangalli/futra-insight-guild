import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { useNotifications, useMarkAsRead } from '@/hooks/useNotifications';
import { Bell, Trophy, Coins, Target, Clock, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeIcons: Record<string, any> = {
  market_resolved: Target,
  credits_won: Coins,
  credits_lost: Coins,
  level_up: Trophy,
  streak_milestone: Trophy,
  system: Bell,
  new_market: Clock,
};

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();

  return (
    <Layout>
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
              const Icon = typeIcons[n.type] || Bell;
              return (
                <div key={n.id} className={cn('flex gap-4 p-4', !n.read && 'bg-surface-800')}>
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    !n.read ? 'bg-primary/10' : 'bg-surface-700'
                  )}>
                    <Icon className={cn('h-4 w-4', !n.read ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
