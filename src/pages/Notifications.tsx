import { Layout } from '@/components/layout/Layout';
import { mockNotifications } from '@/data/mock-users';
import { Bell, Trophy, Coins, Target, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeIcons = {
  result: Target,
  credits: Coins,
  ranking: Trophy,
  badge: Trophy,
  market: Clock,
};

export default function NotificationsPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-6">Notifications</h1>

        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {mockNotifications.map(n => {
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
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.timestamp).toLocaleDateString()}
                  </p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
