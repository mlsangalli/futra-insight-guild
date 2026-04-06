import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

const PAGE_SIZE = 20;

export default function AdminLogs() {
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', page, filterAction, filterEntity],
    queryFn: async () => {
      let query = supabase.from('admin_logs').select('*', { count: 'exact' });
      if (filterAction !== 'all') query = query.eq('action_type', filterAction);
      if (filterEntity !== 'all') query = query.eq('entity_type', filterEntity);
      query = query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, count } = await query;
      return { logs: data || [], total: count || 0 };
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-display font-bold">Logs Administrativos</h1>

        <div className="flex gap-2">
          <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(0); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Ação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas ações</SelectItem>
              <SelectItem value="CREATE">CREATE</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="promote_admin">promote_admin</SelectItem>
              <SelectItem value="demote_admin">demote_admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEntity} onValueChange={(v) => { setFilterEntity(v); setPage(0); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Entidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="market">market</SelectItem>
              <SelectItem value="category">category</SelectItem>
              <SelectItem value="site_content">site_content</SelectItem>
              <SelectItem value="faq">faq</SelectItem>
              <SelectItem value="user">user</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>ID da Entidade</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum log encontrado</TableCell></TableRow>
              ) : (
                logs.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-sm">{l.action_type}</TableCell>
                    <TableCell className="text-sm">{l.entity_type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono max-w-[120px] truncate">{l.entity_id || '-'}</TableCell>
                    <TableCell className="text-sm max-w-[250px] truncate">{l.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(l.created_at), 'dd/MM/yy HH:mm:ss')}
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
