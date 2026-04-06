import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { Users, Store, FolderOpen, FileText, Activity, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const [profiles, markets, activeMarkets, closedMarkets, categories, content, logs] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('markets').select('*', { count: 'exact', head: true }),
        supabase.from('markets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('markets').select('*', { count: 'exact', head: true }).in('status', ['closed', 'resolved']),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('site_content').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('admin_logs').select('*', { count: 'exact', head: true }),
      ]);
      return {
        totalUsers: profiles.count || 0,
        totalMarkets: markets.count || 0,
        activeMarkets: activeMarkets.count || 0,
        closedMarkets: closedMarkets.count || 0,
        totalCategories: categories.count || 0,
        publishedContent: content.count || 0,
      };
    },
  });

  const { data: recentLogs } = useQuery({
    queryKey: ['admin-recent-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: recentMarkets } = useQuery({
    queryKey: ['admin-recent-markets'],
    queryFn: async () => {
      const { data } = await supabase
        .from('markets')
        .select('id, question, status, created_at, category')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const m = metrics || { totalUsers: 0, totalMarkets: 0, activeMarkets: 0, closedMarkets: 0, totalCategories: 0, publishedContent: 0 };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AdminMetricCard title="Total de Usuários" value={m.totalUsers} icon={Users} />
          <AdminMetricCard title="Total de Mercados" value={m.totalMarkets} icon={Store} />
          <AdminMetricCard title="Mercados Ativos" value={m.activeMarkets} icon={TrendingUp} />
          <AdminMetricCard title="Mercados Encerrados" value={m.closedMarkets} icon={Activity} />
          <AdminMetricCard title="Categorias" value={m.totalCategories} icon={FolderOpen} />
          <AdminMetricCard title="Conteúdos Publicados" value={m.publishedContent} icon={FileText} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Mercados Recentes</h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pergunta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMarkets?.map((market) => (
                    <TableRow key={market.id}>
                      <TableCell className="max-w-[200px] truncate text-sm">{market.question}</TableCell>
                      <TableCell>
                        <Badge variant={market.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                          {market.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(market.created_at), 'dd/MM/yy')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!recentMarkets || recentMarkets.length === 0) && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum mercado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Atividades Recentes</h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{log.action_type}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.entity_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'dd/MM/yy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!recentLogs || recentLogs.length === 0) && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhuma atividade</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
