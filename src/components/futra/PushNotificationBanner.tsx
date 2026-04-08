import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useState } from 'react';

export function PushNotificationBanner() {
  const { isSupported, permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('push-banner-dismissed') === 'true');

  if (!isSupported || isSubscribed || permission === 'denied' || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('push-banner-dismissed', 'true');
  };

  const handleSubscribe = async () => {
    const ok = await subscribe();
    if (ok) localStorage.setItem('push-banner-dismissed', 'true');
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3 mb-4">
      <Bell className="h-5 w-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Ativar notificações push</p>
        <p className="text-xs text-muted-foreground">Receba alertas de missões, resultados e recompensas mesmo fora do app.</p>
      </div>
      <Button size="sm" onClick={handleSubscribe} disabled={loading} className="shrink-0">
        {loading ? 'Ativando…' : 'Ativar'}
      </Button>
      <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
