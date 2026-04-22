import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Shield, Clock, CheckCircle2, XCircle, AlertTriangle, MinusCircle } from '@/lib/icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  success: { label: 'OK', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  partial: { label: 'Parcial', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: AlertTriangle },
  failed: { label: 'Falha', color: 'bg-destructive/15 text-destructive border-destructive/30', icon: XCircle },
  skipped: { label: 'Skip', color: 'bg-muted text-muted-foreground border-border', icon: MinusCircle },
};

const JOB_LABELS: Record<string, string> = {
  'close-and-resolve-markets': 'Resolver Mercados',
  'create-markets-from-trends': 'Gerar Mercados',
  'antifraud-check': 'Antifraude',
  'smart-notifications': 'Notificações',
  'maintenance': 'Manutenção',
  'health-monitor': 'Health Monitor',
};

function useJobExecutions() {
  return useQuery({
    queryKey: ['admin-job-executions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('job_executions' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      return (data as unknown as Array<{
        id: string;
        job_name: string;
        status: string;
        duration_ms: number;
        metrics: Record<string, any>;
        error_message: string | null;
        created_at: string;
      }>) || [];
    },
    refetchInterval: 30_000,
  });
}

function useJobSummary() {
  return useQuery({
    queryKey: ['admin-job-summary'],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600000).toISOString();
      const { data } = await supabase
        .from('job_executions' as any)
        .select('job_name, status, duration_ms')
        .gte('created_at', twentyFourHoursAgo);

      const rows = (data as unknown as Array<{ job_name: string; status: string; duration_ms: number }>) || [];
      const summary: Record<string, { total: number; success: number; failed: number; avgDuration: number }> = {};
      for (const row of rows) {
        if (!summary[row.job_name]) {
          summary[row.job_name] = { total: 0, success: 0, failed: 0, avgDuration: 0 };
        }
        const s = summary[row.job_name];
        s.total++;
        if (row.status === 'success') s.success++;
        if (row.status === 'failed') s.failed++;
        s.avgDuration = Math.round(
          (s.avgDuration * (s.total - 1) + row.duration_ms) / s.total
        );
      }
      return summary;
    },
    refetchInterval: 60_000,
  });
}

function useSuspiciousEvents() {
  return useQuery({
    queryKey: ['admin-suspicious-events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('suspicious_events' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);
      return (data as unknown as Array<{
        id: string;
        user_id: string | null;
        event_type: string;
        severity: string;
        description: string;
        metadata: Record<string, any>;
        reviewed: boolean;
        created_at: string;
      }>) || [];
    },
    refetchInterval: 30_000,
  });
}

const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-destructive/15 text-destructive border-destructive/30',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

const EVENT_LABELS: Record<string, string> = {
  rapid_predictions: 'Previsões rápidas',
  concentrated_betting: 'Apostas concentradas',
  comment_spam: 'Spam de comentários',
  signup_burst: 'Pico de cadastros',
};

export function OperationsPanel() {
  const { data: executions } = useJobExecutions();
  const { data: summary } = useJobSummary();
  const { data: suspiciousEvents } = useSuspiciousEvents();

  const unreviewedCount = suspiciousEvents?.filter(e => !e.reviewed).length || 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        Operações & Antifraude
      </h2>

      {/* Job summary cards (24h) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {summary && Object.entries(summary).map(([jobName, stats]) => {
          const hasFailures = stats.failed > 0;
          return (
            <Card key={jobName} className={`bg-card border-border ${hasFailures ? 'border-destructive/30' : ''}`}>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground truncate mb-1">
                  {JOB_LABELS[jobName] || jobName}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold">{stats.total}</span>
                  <span className="text-[10px] text-muted-foreground">exec</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px]">
                  <span className="text-emerald-400">{stats.success}✓</span>
                  {stats.failed > 0 && <span className="text-destructive">{stats.failed}✗</span>}
                  <span className="text-muted-foreground">~{stats.avgDuration}ms</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!summary || Object.keys(summary).length === 0) && (
          <Card className="bg-card border-border col-span-full">
            <CardContent className="p-4 text-center text-xs text-muted-foreground">
              Nenhuma execução nas últimas 24h
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent executions */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Execuções Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Job</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Tempo</TableHead>
                  <TableHead className="text-xs">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions && executions.length > 0 ? executions.slice(0, 15).map((exec) => {
                  const cfg = STATUS_CONFIG[exec.status] || STATUS_CONFIG.skipped;
                  return (
                    <TableRow key={exec.id}>
                      <TableCell className="text-xs truncate max-w-[120px]">
                        {JOB_LABELS[exec.job_name] || exec.job_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {exec.duration_ms}ms
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {format(new Date(exec.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">
                      Nenhuma execução registrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Suspicious events */}
        <Card className={`bg-card border-border ${unreviewedCount > 0 ? 'border-yellow-500/30' : ''}`}>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Eventos Suspeitos
              {unreviewedCount > 0 && (
                <Badge variant="outline" className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-[10px] ml-1">
                  {unreviewedCount} novo(s)
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Sev.</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspiciousEvents && suspiciousEvents.length > 0 ? suspiciousEvents.slice(0, 10).map((evt) => (
                  <TableRow key={evt.id} className={!evt.reviewed ? 'bg-yellow-500/5' : ''}>
                    <TableCell className="text-xs truncate max-w-[100px]">
                      {EVENT_LABELS[evt.event_type] || evt.event_type}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${SEVERITY_BADGE[evt.severity] || ''}`}>
                        {evt.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate text-muted-foreground">
                      {evt.description}
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {format(new Date(evt.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">
                      Nenhum evento suspeito ✓
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
