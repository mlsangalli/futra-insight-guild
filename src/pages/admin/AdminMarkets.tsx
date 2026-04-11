import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAdminLog } from '@/hooks/useAdminLog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Pencil, Trash2, Star, Copy, Search, CheckCircle, Clock, Zap, RotateCw, ThumbsUp, ThumbsDown, Eye, AlertTriangle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CATEGORIES = ['politics', 'economy', 'crypto', 'football', 'culture', 'technology'];
const STATUSES = ['open', 'closed', 'resolved'];
const CANDIDATE_STATUSES = ['new', 'approved', 'rejected', 'published', 'skipped'];
const PAGE_SIZE = 10;

interface MarketOption {
  id: string;
  label: string;
  votes: number;
  creditsAllocated: number;
}

export default function AdminMarkets() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingMarket, setEditingMarket] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [resolvingMarket, setResolvingMarket] = useState<any>(null);
  const [schedulingMarket, setSchedulingMarket] = useState<any>(null);
  const [approvingCandidate, setApprovingCandidate] = useState<any>(null);
  const [candidateFilter, setCandidateFilter] = useState('new');
  const { toast } = useToast();
  const { log } = useAdminLog();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-markets', page, search, filterCategory, filterStatus],
    queryFn: async () => {
      let query = supabase.from('markets').select('*', { count: 'exact' });
      if (search) query = query.ilike('question', `%${search}%`);
      if (filterCategory !== 'all') query = query.eq('category', filterCategory as any);
      if (filterStatus !== 'all') query = query.eq('status', filterStatus as any);
      query = query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, count } = await query;
      return { markets: data || [], total: count || 0 };
    },
  });

  const invokeAdmin = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error');
    }
    return res.json();
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invokeAdmin({ action: 'delete_market', market_id: id, entity_type: 'market', description: 'Deleted market' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-markets'] });
      toast({ title: 'Mercado excluído' });
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      invokeAdmin({ action: 'toggle_featured', market_id: id, featured, entity_type: 'market', description: `Set featured=${featured}` }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-markets'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      invokeAdmin({ action: 'update_market_status', market_id: id, status, entity_type: 'market', description: `Status → ${status}` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-markets'] });
      toast({ title: 'Status atualizado' });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ market_id, winning_option }: { market_id: string; winning_option: string }) =>
      invokeAdmin({
        action: 'resolve_market',
        market_id,
        winning_option,
        entity_type: 'market',
        description: `Resolved market with option: ${winning_option}`,
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-markets'] });
      setResolvingMarket(null);
      const msg = data?.refunded
        ? `Mercado resolvido! Nenhum vencedor — ${data.total_predictions} participantes reembolsados.`
        : `Mercado resolvido! ${data?.winners_count || 0} vencedores de ${data?.total_predictions || 0} participantes.`;
      toast({ title: 'Mercado resolvido', description: msg });
    },
    onError: (e: Error) => toast({ title: 'Erro ao resolver', description: e.message, variant: 'destructive' }),
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ market_id, lock_date }: { market_id: string; lock_date: string | null }) =>
      invokeAdmin({
        action: 'schedule_lock',
        market_id,
        lock_date,
        entity_type: 'market',
        description: lock_date ? `Scheduled lock: ${lock_date}` : 'Removed lock schedule',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-markets'] });
      setSchedulingMarket(null);
      toast({ title: 'Agendamento salvo' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const saveMutation = useMutation({
    mutationFn: async (market: any) => {
      if (market.id) {
        // Use edge function to bypass protect_market_fields trigger
        await invokeAdmin({
          action: 'edit_market',
          market_id: market.id,
          question: market.question,
          description: market.description,
          category: market.category,
          end_date: market.end_date,
          resolution_rules: market.resolution_rules,
          resolution_source: market.resolution_source,
          options: market.options,
          entity_type: 'market',
          description_log: `Edited: ${market.question}`,
        });
      } else {
        const { error } = await supabase.from('markets').insert({
          question: market.question,
          description: market.description,
          category: market.category,
          end_date: market.end_date,
          resolution_rules: market.resolution_rules,
          options: market.options || [],
        });
        if (error) throw error;
        await log('CREATE', 'market', undefined, `Created: ${market.question}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-markets'] });
      setFormOpen(false);
      setEditingMarket(null);
      toast({ title: 'Mercado salvo' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const approveMutation = useMutation({
    mutationFn: (payload: any) => invokeAdmin({
      action: 'approve_candidate',
      candidate_id: payload.candidate_id,
      question: payload.question,
      description: payload.description,
      category: payload.category,
      end_date: payload.end_date,
      options: payload.options,
      resolution_source: payload.resolution_source,
      entity_type: 'scheduled_market',
      entity_description: `Approved candidate: ${payload.question}`,
    }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['admin-markets'] });
      setApprovingCandidate(null);
      toast({ title: 'Candidato aprovado e publicado!', description: `Market ID: ${data.market_id}` });
    },
    onError: (e: Error) => toast({ title: 'Erro ao aprovar', description: e.message, variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: (candidateId: string) => invokeAdmin({
      action: 'reject_candidate',
      candidate_id: candidateId,
      entity_type: 'scheduled_market',
      description: 'Rejected candidate',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-candidates'] });
      toast({ title: 'Candidato rejeitado' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const duplicateMarket = async (market: any) => {
    const { id, created_at, updated_at, ...rest } = market;
    const { error } = await supabase.from('markets').insert({ ...rest, question: `${rest.question} (cópia)`, total_credits: 0, total_participants: 0, status: 'open', resolved_option: null });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    queryClient.invalidateQueries({ queryKey: ['admin-markets'] });
    toast({ title: 'Mercado duplicado' });
  };

  const markets = data?.markets || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Candidates query
  const { data: candidatesData, isLoading: candidatesLoading } = useQuery({
    queryKey: ['admin-candidates', candidateFilter],
    queryFn: async () => {
      let query = (supabase.from('scheduled_markets') as any).select('*');
      if (candidateFilter !== 'all') query = query.eq('status', candidateFilter);
      query = query.order('created_at', { ascending: false }).limit(50);
      const { data } = await query;
      return data || [];
    },
  });

  const triggerAutoCreate = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-markets-from-trends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ time: new Date().toISOString() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-candidates'] });
      toast({ title: 'Geração automática concluída', description: `${data.candidates_created || 0} candidato(s) criado(s) de ${data.trends_found || 0} tendências.` });
    },
    onError: (e: Error) => toast({ title: 'Erro na geração automática', description: e.message, variant: 'destructive' }),
  });

  const retryAiResolve = useMutation({
    mutationFn: async (marketId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/close-and-resolve-markets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ market_id: marketId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-markets'] });
      if (data.resolved > 0) {
        toast({ title: 'Mercado resolvido pela IA' });
      } else {
        toast({ title: 'IA não conseguiu resolver', variant: 'destructive' });
      }
    },
    onError: (e: Error) => toast({ title: 'Erro na re-tentativa', description: e.message, variant: 'destructive' }),
  });

  const candidateStatusBadge = (status: string) => {
    const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      new: 'default',
      approved: 'default',
      published: 'secondary',
      rejected: 'destructive',
      skipped: 'outline',
      failed: 'destructive',
    };
    return map[status] || 'secondary';
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-display font-bold">Mercados</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => triggerAutoCreate.mutate()} disabled={triggerAutoCreate.isPending}>
              <Zap className="h-4 w-4 mr-1" /> {triggerAutoCreate.isPending ? 'Gerando...' : 'Auto-Gerar'}
            </Button>
            <Button onClick={() => { setEditingMarket(null); setFormOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Novo Mercado</Button>
          </div>
        </div>

        {/* Candidate Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Fila de Candidatos
            </h2>
            <Select value={candidateFilter} onValueChange={setCandidateFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {CANDIDATE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pergunta / Tópico</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Cat.</TableHead>
                  <TableHead>Qualidade</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidatesLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : !candidatesData || candidatesData.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Nenhum candidato encontrado</TableCell></TableRow>
                ) : (
                  (candidatesData as any[]).map((c: any) => {
                    const qScore = c.confidence_score != null ? Math.round(c.confidence_score * 100) : null;
                    const pScore = c.priority_score ?? null;
                    const flags: string[] = Array.isArray(c.flags) ? c.flags : [];
                    const classification = qScore !== null
                      ? (qScore >= 80 ? 'strong_candidate' : qScore >= 60 ? 'needs_review' : 'auto_reject')
                      : null;

                    return (
                      <TableRow key={c.id} className={classification === 'strong_candidate' ? 'bg-green-500/5' : classification === 'auto_reject' ? 'bg-destructive/5' : ''}>
                        <TableCell className="max-w-[240px]">
                          <div className="text-sm font-medium truncate">{c.generated_question || c.source_topic}</div>
                          {c.generated_question && c.generated_question !== c.source_topic && (
                            <div className="text-xs text-muted-foreground truncate">Tópico: {c.source_topic}</div>
                          )}
                          {c.ai_notes && (
                            <div className="text-[10px] text-muted-foreground mt-0.5 truncate" title={c.ai_notes}>
                              📝 {c.ai_notes.split(' | ').slice(0, 2).join(' · ')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {c.source === 'google_trends' ? 'Google' : c.source === 'rss' ? 'RSS' : c.source === 'user_suggestion' ? 'Usuário' : c.source}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{c.category}</Badge></TableCell>
                        <TableCell>
                          {qScore !== null ? (
                            <div className="flex items-center gap-1">
                              <span className={cn('text-xs font-mono font-semibold',
                                qScore >= 80 ? 'text-green-500' : qScore >= 60 ? 'text-yellow-500' : 'text-destructive'
                              )}>
                                {qScore}
                              </span>
                              {classification && (
                                <span className={cn('text-[9px] px-1 py-0.5 rounded',
                                  classification === 'strong_candidate' ? 'bg-green-500/20 text-green-500' :
                                  classification === 'needs_review' ? 'bg-yellow-500/20 text-yellow-500' :
                                  'bg-destructive/20 text-destructive'
                                )}>
                                  {classification === 'strong_candidate' ? '★' : classification === 'needs_review' ? '?' : '✗'}
                                </span>
                              )}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {pScore !== null ? (
                            <div className="flex items-center gap-1">
                              <TrendingUp className={cn('h-3 w-3', pScore >= 70 ? 'text-green-500' : pScore >= 50 ? 'text-yellow-500' : 'text-muted-foreground')} />
                              <span className="text-xs font-mono">{pScore}</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {flags.length > 0 ? (
                            <div className="flex items-center gap-1" title={flags.join(', ')}>
                              <AlertTriangle className="h-3 w-3 text-yellow-500" />
                              <span className="text-[10px] text-muted-foreground">{flags.length}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-green-500">✓</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={candidateStatusBadge(c.status)} className="text-xs">{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(c.status === 'new' || c.status === 'skipped') && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-500 hover:text-green-400"
                                  onClick={() => setApprovingCandidate(c)}
                                  title="Aprovar e publicar"
                                >
                                  <ThumbsUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => rejectMutation.mutate(c.id)}
                                  disabled={rejectMutation.isPending}
                                  title="Rejeitar"
                                >
                                  <ThumbsDown className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {c.market_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => window.open(`/market/${c.market_id}`, '_blank')}
                                title="Ver mercado"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Markets Table */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar mercados..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
          </div>
          <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(0); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pergunta</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Participantes</TableHead>
                <TableHead>Travamento</TableHead>
                <TableHead>Destaque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
               ) : markets.length === 0 ? (
                 <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum mercado encontrado</TableCell></TableRow>
              ) : (
                markets.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="max-w-[250px] truncate text-sm font-medium">{m.question}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{m.category}</Badge></TableCell>
                    <TableCell>
                      <Select defaultValue={m.status} onValueChange={(s) => statusMutation.mutate({ id: m.id, status: s })}>
                        <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm">{m.total_participants}</TableCell>
                    <TableCell className="text-xs">
                      {m.lock_date ? (
                        <span className={m.lock_date && new Date(m.lock_date) <= new Date() ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                          {format(new Date(m.lock_date), 'dd/MM/yy HH:mm')}
                          {new Date(m.lock_date) <= new Date() && <Badge variant="outline" className="ml-1 text-[10px] border-destructive text-destructive">Travado</Badge>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => toggleFeatured.mutate({ id: m.id, featured: !m.featured })} className="hover:text-primary transition-colors">
                        <Star className={`h-4 w-4 ${m.featured ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {m.status === 'open' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setSchedulingMarket(m)}
                            title="Agendar travamento"
                          >
                            <Clock className={cn("h-3.5 w-3.5", m.lock_date ? 'text-primary' : 'text-muted-foreground')} />
                          </Button>
                        )}
                        {m.status !== 'resolved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-500 hover:text-green-400"
                            onClick={() => setResolvingMarket(m)}
                            title="Resolver mercado"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {m.status === 'closed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-accent-foreground hover:text-primary"
                            onClick={() => retryAiResolve.mutate(m.id)}
                            disabled={retryAiResolve.isPending}
                            title="Re-tentar resolução via IA"
                          >
                            <RotateCw className={cn("h-3.5 w-3.5", retryAiResolve.isPending && "animate-spin")} />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingMarket(m); setFormOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateMarket(m)}><Copy className="h-3.5 w-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir mercado?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(m.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próximo</Button>
          </div>
        )}

        <MarketFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          market={editingMarket}
          onSave={(m: any) => saveMutation.mutate(m)}
          saving={saveMutation.isPending}
        />

        <ResolveMarketDialog
          market={resolvingMarket}
          open={!!resolvingMarket}
          onOpenChange={(open) => { if (!open) setResolvingMarket(null); }}
          onResolve={(marketId, winningOption) => resolveMutation.mutate({ market_id: marketId, winning_option: winningOption })}
          resolving={resolveMutation.isPending}
        />

        <ScheduleLockDialog
          market={schedulingMarket}
          open={!!schedulingMarket}
          onOpenChange={(open) => { if (!open) setSchedulingMarket(null); }}
          onSchedule={(marketId, lockDate) => scheduleMutation.mutate({ market_id: marketId, lock_date: lockDate })}
          saving={scheduleMutation.isPending}
        />

        <ApproveCandidateDialog
          candidate={approvingCandidate}
          open={!!approvingCandidate}
          onOpenChange={(open) => { if (!open) setApprovingCandidate(null); }}
          onApprove={(payload) => approveMutation.mutate(payload)}
          approving={approveMutation.isPending}
        />
      </div>
    </AdminLayout>
  );
}

function ApproveCandidateDialog({ candidate, open, onOpenChange, onApprove, approving }: {
  candidate: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (payload: any) => void;
  approving: boolean;
}) {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [endDate, setEndDate] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [resolutionSource, setResolutionSource] = useState('');
  const [checklist, setChecklist] = useState<boolean[]>(new Array(10).fill(false));

  const CHECKLIST_ITEMS = [
    'Entendida em < 2 segundos?',
    'Resultado verificável?',
    'Prazo explícito?',
    'Opções coerentes e excludentes?',
    'Fonte de resolução clara?',
    'Tema com interesse real?',
    'Potencial de compartilhamento?',
    'Não é duplicada?',
    'Não é ambígua?',
    'Alinhada à proposta FUTRA?',
  ];

  const reset = () => {
    if (candidate) {
      setQuestion(candidate.generated_question || candidate.source_topic || '');
      setDescription(candidate.generated_description || '');
      setCategory(candidate.category || 'politics');
      setEndDate(candidate.end_date ? format(new Date(candidate.end_date), "yyyy-MM-dd'T'HH:mm") : format(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd'T'HH:mm"));
      const opts = candidate.generated_options || [];
      setOptionsText(opts.map((o: any) => typeof o === 'string' ? o : o.label).join('\n'));
      setResolutionSource(candidate.resolution_source || '');
      setChecklist(new Array(10).fill(false));
    }
  };

  const allChecked = checklist.every(Boolean);
  const checkedCount = checklist.filter(Boolean).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const options = optionsText.split('\n').map(l => l.trim()).filter(Boolean).map(label => ({ label }));
    if (options.length < 2) return;
    onApprove({
      candidate_id: candidate.id,
      question,
      description,
      category,
      end_date: endDate,
      options,
      resolution_source: resolutionSource,
    });
  };

  const qualityScore = candidate?.confidence_score != null ? Math.round(candidate.confidence_score * 100) : null;
  const priorityScore = candidate?.priority_score ?? null;
  const candidateFlags: string[] = Array.isArray(candidate?.flags) ? candidate.flags : [];
  const aiNotes = candidate?.ai_notes || '';
  const classification = qualityScore !== null
    ? (qualityScore >= 80 ? 'strong_candidate' : qualityScore >= 60 ? 'needs_review' : 'auto_reject')
    : null;

  const FLAG_LABELS: Record<string, string> = {
    ambiguous_question: '❓ Pergunta ambígua',
    no_clear_deadline: '⏰ Sem prazo claro',
    weak_resolution_source: '📄 Fonte fraca',
    duplicate_candidate: '🔁 Duplicata',
    low_engagement_potential: '📉 Baixo engajamento',
    poor_options: '⚠️ Opções ruins',
    low_shareability: '📤 Baixo compartilhamento',
    subjective_outcome: '🤔 Resultado subjetivo',
    past_date_reference: '📅 Data passada',
    vague_language: '💬 Linguagem vaga',
    question_too_short: '📏 Pergunta curta',
    question_too_long: '📏 Pergunta longa',
    description_too_brief: '📝 Descrição breve',
    duplicate_options: '🔄 Opções duplicadas',
    options_too_similar: '🔄 Opções parecidas',
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aprovar e Publicar Candidato</DialogTitle>
          <DialogDescription>
            Revise pelo padrão editorial antes de publicar.
            {qualityScore !== null && (
              <span className="ml-2">
                <span className={cn('font-semibold',
                  qualityScore >= 80 ? 'text-green-500' : qualityScore >= 60 ? 'text-yellow-500' : 'text-destructive'
                )}>
                  Q:{qualityScore}
                </span>
                {priorityScore !== null && (
                  <span className="text-muted-foreground ml-1">P:{priorityScore}</span>
                )}
                {classification && (
                  <Badge variant={classification === 'strong_candidate' ? 'default' : classification === 'needs_review' ? 'secondary' : 'destructive'} className="ml-2 text-[10px]">
                    {classification === 'strong_candidate' ? '★ Strong' : classification === 'needs_review' ? '? Review' : '✗ Weak'}
                  </Badge>
                )}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Flags */}
        {candidateFlags.length > 0 && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-2 space-y-1">
            <span className="text-[10px] font-semibold text-yellow-500 uppercase tracking-wide">Flags Detectadas</span>
            <div className="flex flex-wrap gap-1">
              {candidateFlags.map((f: string) => (
                <span key={f} className="text-[10px] bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 rounded px-1.5 py-0.5">
                  {FLAG_LABELS[f] || f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI Notes */}
        {aiNotes && (
          <div className="rounded-lg border border-border p-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Notas da IA</span>
            <p className="text-xs text-muted-foreground mt-0.5">{aiNotes}</p>
          </div>
        )}

        {/* Editorial Checklist */}
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Checklist Editorial</span>
            <span className={cn('text-xs font-medium', allChecked ? 'text-green-500' : 'text-muted-foreground')}>
              {checkedCount}/10
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1">
            {CHECKLIST_ITEMS.map((item, i) => (
              <label key={i} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={checklist[i]}
                  onChange={() => {
                    const next = [...checklist];
                    next[i] = !next[i];
                    setChecklist(next);
                  }}
                  className="rounded border-border"
                />
                <span className={checklist[i] ? 'text-foreground' : 'text-muted-foreground'}>{item}</span>
              </label>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Pergunta *</Label>
            <Input value={question} onChange={e => setQuestion(e.target.value)} required />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data limite</Label>
              <Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
          </div>
          <div>
            <Label>Opções (uma por linha, mínimo 2)</Label>
            <Textarea value={optionsText} onChange={e => setOptionsText(e.target.value)} rows={3} placeholder="Sim&#10;Não" />
          </div>
          <div>
            <Label>Fonte de resolução</Label>
            <Input value={resolutionSource} onChange={e => setResolutionSource(e.target.value)} />
          </div>
          {!allChecked && (
            <p className="text-xs text-yellow-500">⚠ Complete o checklist editorial antes de aprovar.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              type="submit"
              disabled={approving || !allChecked}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              {approving ? 'Publicando...' : 'Aprovar e Publicar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResolveMarketDialog({ market, open, onOpenChange, onResolve, resolving }: {
  market: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (marketId: string, winningOption: string) => void;
  resolving: boolean;
}) {
  const [selectedOption, setSelectedOption] = useState<string>('');

  const options: MarketOption[] = market?.options
    ? (Array.isArray(market.options) ? market.options : [])
    : [];

  const totalCredits = options.reduce((sum, o) => sum + (o.creditsAllocated || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setSelectedOption(''); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resolver Mercado</DialogTitle>
          <DialogDescription className="text-sm">
            Selecione a opção vencedora para "{market?.question}". Esta ação é irreversível.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 my-2">
          <p className="text-xs text-muted-foreground">
            Pool total: <span className="font-semibold text-foreground">{totalCredits} créditos</span> · {market?.total_participants || 0} participantes
          </p>
          <div className="space-y-1.5">
            {options.map((opt) => {
              const pct = totalCredits > 0 ? Math.round((opt.creditsAllocated / totalCredits) * 100) : 0;
              const isSelected = selectedOption === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedOption(opt.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{opt.label}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{opt.votes} votos</span>
                      <span>{opt.creditsAllocated} cr</span>
                      <span className="font-semibold text-foreground">{pct}%</span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={resolving}>
            Cancelar
          </Button>
          <Button
            onClick={() => { if (selectedOption && market?.id) onResolve(market.id, selectedOption); }}
            disabled={!selectedOption || resolving}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {resolving ? 'Resolvendo...' : 'Confirmar Resolução'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarketFormDialog({ open, onOpenChange, market, onSave, saving }: any) {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('politics');
  const [endDate, setEndDate] = useState('');
  const [rules, setRules] = useState('');
  const [resolutionSource, setResolutionSource] = useState('');
  const [optionLabels, setOptionLabels] = useState<{ id: string; label: string }[]>([]);

  const reset = () => {
    if (market) {
      setQuestion(market.question || '');
      setDescription(market.description || '');
      setCategory(market.category || 'politics');
      setEndDate(market.end_date ? format(new Date(market.end_date), "yyyy-MM-dd'T'HH:mm") : '');
      setRules(market.resolution_rules || '');
      setResolutionSource(market.resolution_source || '');
      // Parse options from JSONB
      const opts = Array.isArray(market.options) ? market.options : [];
      setOptionLabels(opts.map((o: any) => ({ id: o.id || '', label: o.label || '' })));
    } else {
      setQuestion(''); setDescription(''); setCategory('politics'); setEndDate(''); setRules('');
      setResolutionSource(''); setOptionLabels([]);
    }
  };

  const updateOptionLabel = (index: number, newLabel: string) => {
    setOptionLabels(prev => prev.map((o, i) => i === index ? { ...o, label: newLabel } : o));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: market?.id,
      question,
      description,
      category,
      end_date: endDate,
      resolution_rules: rules,
      resolution_source: resolutionSource,
      options: market?.id ? optionLabels : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{market ? 'Editar Mercado' : 'Novo Mercado'}</DialogTitle>
          <DialogDescription>Preencha os dados do mercado</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Pergunta *</Label>
            <Input value={question} onChange={e => setQuestion(e.target.value)} required />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data limite</Label>
              <Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
          </div>
          {/* Option labels editing (only when editing existing market) */}
          {market?.id && optionLabels.length > 0 && (
            <div className="space-y-2">
              <Label>Opções (respostas)</Label>
              {optionLabels.map((opt, i) => (
                <Input
                  key={opt.id || i}
                  value={opt.label}
                  onChange={e => updateOptionLabel(i, e.target.value)}
                  placeholder={`Opção ${i + 1}`}
                />
              ))}
            </div>
          )}
          <div>
            <Label>Fonte de resolução</Label>
            <Input value={resolutionSource} onChange={e => setResolutionSource(e.target.value)} placeholder="Ex: ge.globo.com, reuters.com" />
          </div>
          <div>
            <Label>Regras de resolução</Label>
            <Textarea value={rules} onChange={e => setRules(e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleLockDialog({ market, open, onOpenChange, onSchedule, saving }: {
  market: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (marketId: string, lockDate: string | null) => void;
  saving: boolean;
}) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState('12:00');

  const marketLockDate = market?.lock_date;
  if (open && date === undefined && marketLockDate) {
    setDate(new Date(marketLockDate));
    setTime(format(new Date(marketLockDate), 'HH:mm'));
  }

  const handleSave = () => {
    if (!market?.id) return;
    if (!date) {
      onSchedule(market.id, null);
      return;
    }
    const [h, m] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(h, m, 0, 0);
    onSchedule(market.id, combined.toISOString());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        setDate(undefined);
        setTime('12:00');
      }
      onOpenChange(o);
    }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Agendar Travamento</DialogTitle>
          <DialogDescription className="text-sm">
            Defina a data e hora em que o mercado será travado para novas apostas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <Clock className="mr-2 h-4 w-4" />
                  {date ? format(date, 'dd/MM/yyyy') : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-xs">Horário</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>

          {market?.lock_date && (
            <p className="text-xs text-muted-foreground">
              Agendamento atual: {format(new Date(market.lock_date), 'dd/MM/yyyy HH:mm')}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {market?.lock_date && (
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => { if (market?.id) onSchedule(market.id, null); }}
              disabled={saving}
            >
              Remover
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
