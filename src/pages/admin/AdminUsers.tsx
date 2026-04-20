import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, ShieldOff, Search } from '@/lib/icons';
import { format } from 'date-fns';

const PAGE_SIZE = 15;

export default function AdminUsers() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*', { count: 'exact' });
      if (search) query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
      query = query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data: profiles, count } = await query;

      // Get admin roles
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const adminSet = new Set((roles || []).filter(r => r.role === 'admin').map(r => r.user_id));

      return {
        users: (profiles || []).map(p => ({ ...p, isAdmin: adminSet.has(p.user_id) })),
        total: count || 0,
      };
    },
  });

  const invokeAdmin = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error'); }
    return res.json();
  };

  const promoteMutation = useMutation({
    mutationFn: (userId: string) => invokeAdmin({ action: 'promote_admin', user_id: userId, entity_type: 'user', description: 'Promoted to admin' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Usuário promovido a admin' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const demoteMutation = useMutation({
    mutationFn: (userId: string) => invokeAdmin({ action: 'demote_admin', user_id: userId, entity_type: 'user', description: 'Removed admin' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Privilégio admin removido' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-display font-bold">Usuários</h1>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou username..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Créditos</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum usuário</TableCell></TableRow>
              ) : (
                users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.display_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">@{u.username}</TableCell>
                    <TableCell>
                      {u.isAdmin ? <Badge className="bg-primary/20 text-primary border-0">Admin</Badge> : <Badge variant="secondary">User</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{u.futra_credits?.toLocaleString()} FC</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(u.created_at), 'dd/MM/yy')}</TableCell>
                    <TableCell className="text-right">
                      {u.isAdmin ? (
                        u.user_id === user?.id ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive"><ShieldOff className="h-4 w-4 mr-1" /> Remover</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover seu próprio acesso admin?</AlertDialogTitle>
                                <AlertDialogDescription>Você perderá acesso ao painel administrativo. Tem certeza?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => demoteMutation.mutate(u.user_id)}>Confirmar remoção</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => demoteMutation.mutate(u.user_id)}>
                            <ShieldOff className="h-4 w-4 mr-1" /> Remover
                          </Button>
                        )
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => promoteMutation.mutate(u.user_id)}>
                          <Shield className="h-4 w-4 mr-1" /> Promover
                        </Button>
                      )}
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
      </div>
    </AdminLayout>
  );
}
