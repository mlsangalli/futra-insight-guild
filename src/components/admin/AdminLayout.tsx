import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { AdminGuard } from './AdminGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useSyntheticMarkets } from '@/hooks/useSyntheticMarket';
import { FlaskConical } from '@/lib/icons';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { enabledCount } = useSyntheticMarkets();

  return (
    <AdminGuard>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {enabledCount > 0 && (
              <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-1.5 flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                <FlaskConical className="h-3.5 w-3.5" />
                <span>Modo simulação ativo em <strong>{enabledCount}</strong> mercado{enabledCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card/50">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <span className="text-sm text-muted-foreground hidden sm:inline">Painel Administrativo</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {profile?.display_name || profile?.username}
              </div>
            </header>
            <main className="flex-1 p-4 md:p-6 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AdminGuard>
  );
}
