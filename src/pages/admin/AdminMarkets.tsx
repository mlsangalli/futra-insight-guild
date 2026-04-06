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
import { Plus, Pencil, Trash2, Star, Copy, Search, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CATEGORIES = ['politics', 'economy', 'crypto', 'football', 'culture', 'technology'];
const STATUSES = ['open', 'closed', 'resolved'];
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

  const saveMutation = useMutation({
    mutationFn: async (market: any) => {
      if (market.id) {
        const { error } = await supabase.from('markets').update({
          question: market.question,
          description: market.description,
          category: market.category,
          end_date: market.end_date,
          resolution_rules: market.resolution_rules,
        }).eq('id', market.id);
        if (error) throw error;
        await log('UPDATE', 'market', market.id, `Edited: ${market.question}`);
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

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-display font-bold">Mercados</h1>
          <Button onClick={() => { setEditingMarket(null); setFormOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Novo Mercado</Button>
        </div>

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
                <TableHead>Destaque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : markets.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum mercado encontrado</TableCell></TableRow>
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
                    <TableCell>
                      <button onClick={() => toggleFeatured.mutate({ id: m.id, featured: !m.featured })} className="hover:text-primary transition-colors">
                        <Star className={`h-4 w-4 ${m.featured ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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
      </div>
    </AdminLayout>
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

  const reset = () => {
    if (market) {
      setQuestion(market.question || '');
      setDescription(market.description || '');
      setCategory(market.category || 'politics');
      setEndDate(market.end_date ? format(new Date(market.end_date), "yyyy-MM-dd'T'HH:mm") : '');
      setRules(market.resolution_rules || '');
    } else {
      setQuestion(''); setDescription(''); setCategory('politics'); setEndDate(''); setRules('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{market ? 'Editar Mercado' : 'Novo Mercado'}</DialogTitle>
          <DialogDescription>Preencha os dados do mercado</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ id: market?.id, question, description, category, end_date: endDate, resolution_rules: rules }); }} className="space-y-4">
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
