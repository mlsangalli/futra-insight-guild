import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { MonitoringPanel } from '@/components/admin/MonitoringPanel';
import { Users, Store, FolderOpen, FileText, Activity, TrendingUp, Lock, CheckCircle, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_COLORS = {
  open: 'hsl(162, 80%, 50%)',
  locked: 'hsl(45, 90%, 55%)',
  closed: 'hsl(217, 100%, 59%)',
  resolved: 'hsl(280, 70%, 55%)',
};

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

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-sm font-medium" style={{ color: payload[0].payload.fill }}>
        {payload[0].name}: {payload[0].value}
      </p>
    </div>
  );
};

export default function AdminDashboard() {
  const queryClient = useQueryClient();

  // Real-time subscription for markets table
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['admin-market-status'] });
        queryClient.invalidateQueries({ queryKey: ['admin-recent-markets'] });
        queryClient.invalidateQueries({ queryKey: ['admin-growth'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const [profiles, markets, activeMarkets, closedMarkets, resolvedMarkets, categories, content, predictions, totalCredits] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('markets').select('*', { count: 'exact', head: true }),
        supabase.from('markets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('markets').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
        supabase.from('markets').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('site_content').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('predictions').select('*', { count: 'exact', head: true }),
        supabase.from('markets').select('total_credits'),
      ]);

      // Count locked markets (open but lock_date has passed)
      const { count: lockedCount } = await supabase
        .from('markets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .not('lock_date', 'is', null)
        .lte('lock_date', new Date().toISOString());

      const creditsSum = (totalCredits.data || []).reduce((s, m) => s + (m.total_credits || 0), 0);

      return {
        totalUsers: profiles.count || 0,
        totalMarkets: markets.count || 0,
        activeMarkets: activeMarkets.count || 0,
        closedMarkets: closedMarkets.count || 0,
        resolvedMarkets: resolvedMarkets.count || 0,
        lockedMarkets: lockedCount || 0,
        totalCategories: categories.count || 0,
        publishedContent: content.count || 0,
        totalPredictions: predictions.count || 0,
        totalCreditsInPlay: creditsSum,
      };
    },
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const { data: statusData } = useQuery({
    queryKey: ['admin-market-status'],
    queryFn: async () => {
      const { data: allMarkets } = await supabase.from('markets').select('status, lock_date');
      const counts = { open: 0, locked: 0, closed: 0, resolved: 0 };
      const now = new Date();
      (allMarkets || []).forEach((m: any) => {
        if (m.status === 'resolved') {
          counts.resolved++;
        } else if (m.status === 'closed') {
          counts.closed++;
        } else if (m.status === 'open' && m.lock_date && new Date(m.lock_date) <= now) {
          counts.locked++;
        } else {
          counts.open++;
        }
      });
      return [
        { name: 'Ativos', value: counts.open, fill: STATUS_COLORS.open },
        { name: 'Travados', value: counts.locked, fill: STATUS_COLORS.locked },
        { name: 'Fechados', value: counts.closed, fill: STATUS_COLORS.closed },
        { name: 'Resolvidos', value: counts.resolved, fill: STATUS_COLORS.resolved },
      ].filter(d => d.value > 0);
    },
    refetchInterval: 30000,
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
      const { data } = await supabase.from('markets').select('id, question, status, created_at, category, lock_date, total_credits, total_participants').order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
  });

  const m = metrics || { totalUsers: 0, totalMarkets: 0, activeMarkets: 0, closedMarkets: 0, resolvedMarkets: 0, lockedMarkets: 0, totalCategories: 0, publishedContent: 0, totalPredictions: 0, totalCreditsInPlay: 0 };

  const getMarketStatusBadge = (market: any) => {
    const now = new Date();
    if (market.status === 'resolved') return <Badge className="bg-[hsl(280,70%,55%)] text-white text-[10px]">Resolvido</Badge>;
    if (market.status === 'closed') return <Badge className="bg-[hsl(217,100%,59%)] text-white text-[10px]">Fechado</Badge>;
    if (market.lock_date && new Date(market.lock_date) <= now) return <Badge className="bg-[hsl(45,90%,55%)] text-black text-[10px]">Travado</Badge>;
    return <Badge className="bg-[hsl(162,80%,50%)] text-black text-[10px]">Ativo</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Dashboard</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Tempo real
          </div>
        </div>

        {/* Market status cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <AdminMetricCard title="Mercados Ativos" value={m.activeMarkets - m.lockedMarkets} icon={TrendingUp} />
          <AdminMetricCard title="Travados" value={m.lockedMarkets} icon={Lock} description="Apostas bloqueadas" />
          <AdminMetricCard title="Fechados" value={m.closedMarkets} icon={Clock} />
          <AdminMetricCard title="Resolvidos" value={m.resolvedMarkets} icon={CheckCircle} />
          <AdminMetricCard title="Total de Mercados" value={m.totalMarkets} icon={Store} />
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <AdminMetricCard title="Usuários" value={m.totalUsers} icon={Users} />
          <AdminMetricCard title="Predições" value={m.totalPredictions} icon={Activity} />
          <AdminMetricCard title="Créditos em Jogo" value={m.totalCreditsInPlay.toLocaleString()} icon={Store} />
          <AdminMetricCard title="Categorias" value={m.totalCategories} icon={FolderOpen} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status distribution pie */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {(statusData || []).map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend
                      formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Growth chart */}
          <Card className="bg-card border-border lg:col-span-2">
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
        </div>

        {/* Category + daily activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Mercados por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
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

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Atividade Diária (30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
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
        </div>

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
                    <TableHead>Créditos</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMarkets?.map((market: any) => (
                    <TableRow key={market.id}>
                      <TableCell className="max-w-[180px] truncate text-sm">{market.question}</TableCell>
                      <TableCell>{getMarketStatusBadge(market)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{market.total_credits}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(market.created_at), 'dd/MM/yy')}</TableCell>
                    </TableRow>
                  ))}
                  {(!recentMarkets || recentMarkets.length === 0) && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum mercado</TableCell></TableRow>
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
