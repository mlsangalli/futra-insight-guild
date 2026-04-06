import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { Users, Store, FolderOpen, FileText, Activity, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';

function useGrowthData() {
  return useQuery({
    queryKey: ['admin-growth'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const [profilesRes, marketsRes] = await Promise.all([
        supabase.from('profiles').select('created_at').gte('created_at', thirtyDaysAgo).order('created_at'),
        supabase.from('markets').select('created_at, status').gte('created_at', thirtyDaysAgo).order('created_at'),
      ]);

      const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });

      const dayMap = new Map<string, { users: number; markets: number }>();
      days.forEach(d => {
        dayMap.set(format(d, 'yyyy-MM-dd'), { users: 0, markets: 0 });
      });

      (profilesRes.data || []).forEach(p => {
        const key = format(new Date(p.created_at), 'yyyy-MM-dd');
        const entry = dayMap.get(key);
        if (entry) entry.users++;
      });

      (marketsRes.data || []).forEach(m => {
        const key = format(new Date(m.created_at), 'yyyy-MM-dd');
        const entry = dayMap.get(key);
        if (entry) entry.markets++;
      });

      let cumulativeUsers = 0;
      let cumulativeMarkets = 0;
      const chartData = days.map(d => {
        const key = format(d, 'yyyy-MM-dd');
        const entry = dayMap.get(key)!;
        cumulativeUsers += entry.users;
        cumulativeMarkets += entry.markets;
        return {
          date: format(d, 'dd/MM', { locale: ptBR }),
          users: cumulativeUsers,
          markets: cumulativeMarkets,
          newUsers: entry.users,
          newMarkets: entry.markets,
        };
      });

      // Category distribution
      const { data: allMarkets } = await supabase.from('markets').select('category');
      const catCounts: Record<string, number> = {};
      (allMarkets || []).forEach(m => {
        catCounts[m.category] = (catCounts[m.category] || 0) + 1;
      });
      const categoryData = Object.entries(catCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

      return { chartData, categoryData };
    },
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const [profiles, markets, activeMarkets, closedMarkets, categories, content] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('markets').select('*', { count: 'exact', head: true }),
        supabase.from('markets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('markets').select('*', { count: 'exact', head: true }).in('status', ['closed', 'resolved']),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('site_content').select('*', { count: 'exact', head: true }).eq('active', true),
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

  const { data: growth } = useGrowthData();

  const { data: recentLogs } = useQuery({
    queryKey: ['admin-recent-logs'],
    queryFn: async () => {
      const { data } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: recentMarkets } = useQuery({
    queryKey: ['admin-recent-markets'],
    queryFn: async () => {
      const { data } = await supabase.from('markets').select('id, question, status, created_at, category').order('created_at', { ascending: false }).limit(5);
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Crescimento Acumulado (30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growth?.chartData || []} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217, 100%, 59%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(217, 100%, 59%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradMarkets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(162, 80%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(162, 80%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(222, 20%, 55%)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(222, 20%, 55%)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="users" name="Usuários" stroke="hsl(217, 100%, 59%)" fill="url(#gradUsers)" strokeWidth={2} />
                    <Area type="monotone" dataKey="markets" name="Mercados" stroke="hsl(162, 80%, 50%)" fill="url(#gradMarkets)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Mercados por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growth?.categoryData || []} margin={{ top: 5, right: 10, left: -15, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(222, 20%, 55%)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(222, 20%, 55%)' }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Mercados" fill="hsl(217, 100%, 59%)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New daily activity chart */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Atividade Diária (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growth?.chartData || []} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(222, 20%, 55%)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(222, 20%, 55%)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="newUsers" name="Novos Usuários" fill="hsl(217, 100%, 59%)" radius={[4, 4, 0, 0]} barSize={8} />
                  <Bar dataKey="newMarkets" name="Novos Mercados" fill="hsl(162, 80%, 50%)" radius={[4, 4, 0, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tables */}
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
                        <Badge variant={market.status === 'open' ? 'default' : 'secondary'} className="text-xs">{market.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(market.created_at), 'dd/MM/yy')}</TableCell>
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
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'dd/MM/yy HH:mm')}</TableCell>
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
