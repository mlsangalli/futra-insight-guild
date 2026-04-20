import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HeartPulse, RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, Loader2 } from '@/lib/icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HealthData {
  status: string;
  alerts: string[];
  stuck_markets: number;
  cron_runs_2h: number;
  recent_errors_2h: number;
  checked_at: string;
}

function useHealthMonitor() {
  return useQuery<HealthData>({
    queryKey: ['admin-health-monitor'],
    queryFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/health-monitor`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
      return res.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

function useStuckMarkets() {
  return useQuery({
    queryKey: ['admin-stuck-markets'],
    queryFn: async () => {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 3600000).toISOString();
      const { data } = await supabase
        .from('markets')
        .select('id, question, end_date, total_participants, total_credits')
        .eq('status', 'closed')
        .lt('end_date', fortyEightHoursAgo)
        .order('end_date', { ascending: true })
        .limit(10);
      return data || [];
    },
    refetchInterval: 60_000,
  });
}

function useRecentErrors() {
  return useQuery({
    queryKey: ['admin-recent-errors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_logs')
        .select('id, action_type, description, entity_id, created_at')
        .like('action_type', '%error%')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 60_000,
  });
}

function useLastMaintenance() {
  return useQuery({
    queryKey: ['admin-last-maintenance'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_logs')
        .select('created_at, description')
        .eq('action_type', 'maintenance')
        .order('created_at', { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    refetchInterval: 120_000,
  });
}

export function MonitoringPanel() {
  const { data: health, isLoading: healthLoading, refetch: refetchHealth, isFetching } = useHealthMonitor();
  const { data: stuckMarkets } = useStuckMarkets();
  const { data: recentErrors } = useRecentErrors();
  const { data: lastMaintenance } = useLastMaintenance();

  const isHealthy = health?.status === 'healthy';
  const statusIcon = healthLoading ? (
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  ) : isHealthy ? (
    <CheckCircle2 className="h-5 w-5 text-green-500" />
  ) : (
    <AlertTriangle className="h-5 w-5 text-yellow-500" />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-primary" />
          Monitoramento
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetchHealth()}
          disabled={isFetching}
          className="text-xs"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              {statusIcon}
              <span className="text-xs text-muted-foreground">Health</span>
            </div>
            <p className="text-sm font-semibold">
              {healthLoading ? 'Verificando...' : isHealthy ? 'Saudável' : 'Alertas'}
            </p>
            {health?.checked_at && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {format(new Date(health.checked_at), 'HH:mm:ss', { locale: ptBR })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Cron (2h)</span>
            </div>
            <p className="text-sm font-semibold">{health?.cron_runs_2h ?? '—'} execuções</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Stuck</span>
            </div>
            <p className={`text-sm font-semibold ${(stuckMarkets?.length || 0) > 0 ? 'text-yellow-500' : ''}`}>
              {stuckMarkets?.length ?? health?.stuck_markets ?? 0} mercado(s)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Erros (2h)</span>
            </div>
            <p className={`text-sm font-semibold ${(health?.recent_errors_2h || 0) >= 5 ? 'text-destructive' : ''}`}>
              {health?.recent_errors_2h ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Last maintenance */}
      {lastMaintenance && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          Última manutenção: {format(new Date(lastMaintenance.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
          {lastMaintenance.description && (
            <span className="ml-1 truncate max-w-[300px]">— {lastMaintenance.description}</span>
          )}
        </div>
      )}

      {/* Alerts from health monitor */}
      {health?.alerts && health.alerts.length > 0 && (
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium text-yellow-500 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Alertas Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ul className="space-y-1">
              {health.alerts.map((alert, i) => (
                <li key={i} className="text-xs text-muted-foreground">{alert}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Stuck markets table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Mercados Travados (&gt;48h)</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Pergunta</TableHead>
                  <TableHead className="text-xs">Encerrado</TableHead>
                  <TableHead className="text-xs">FC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stuckMarkets && stuckMarkets.length > 0 ? stuckMarkets.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs max-w-[160px] truncate">{m.question}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{format(new Date(m.end_date), 'dd/MM HH:mm')}</TableCell>
                    <TableCell className="text-xs">{m.total_credits}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-4">
                      Nenhum mercado travado ✓
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Erros Recentes</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentErrors && recentErrors.length > 0 ? recentErrors.map((err) => (
                  <TableRow key={err.id}>
                    <TableCell>
                      <Badge variant="destructive" className="text-[10px]">{err.action_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[160px] truncate text-muted-foreground">
                      {err.description || '—'}
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {format(new Date(err.created_at), 'dd/MM HH:mm')}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-4">
                      Nenhum erro recente ✓
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
