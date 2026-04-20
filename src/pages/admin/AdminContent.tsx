import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAdminLog } from '@/hooks/useAdminLog';
import { Plus, Pencil, Trash2 } from '@/lib/icons';

export default function AdminContent() {
  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-display font-bold">Conteúdo do Site</h1>
        <Tabs defaultValue="sections">
          <TabsList>
            <TabsTrigger value="sections">Seções do Site</TabsTrigger>
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
          </TabsList>
          <TabsContent value="sections"><SiteContentSection /></TabsContent>
          <TabsContent value="faqs"><FaqSection /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function SiteContentSection() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { toast } = useToast();
  const { log } = useAdminLog();
  const queryClient = useQueryClient();

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ['admin-site-content'],
    queryFn: async () => {
      const { data } = await supabase.from('site_content').select('*').order('section_key');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (item: any) => {
      if (item.id) {
        const { error } = await supabase.from('site_content').update({ title: item.title, subtitle: item.subtitle, body: item.body, cta_label: item.cta_label, cta_link: item.cta_link, active: item.active }).eq('id', item.id);
        if (error) throw error;
        await log('UPDATE', 'site_content', item.id, `Edited: ${item.section_key}`);
      } else {
        const { error } = await supabase.from('site_content').insert(item);
        if (error) throw error;
        await log('CREATE', 'site_content', undefined, `Created: ${item.section_key}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-site-content'] });
      setFormOpen(false);
      setEditing(null);
      toast({ title: 'Conteúdo salvo' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('site_content').delete().eq('id', id);
      if (error) throw error;
      await log('DELETE', 'site_content', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-site-content'] });
      toast({ title: 'Conteúdo excluído' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('site_content').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-site-content'] }),
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Nova Seção</Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chave</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Ativa</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : contents.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum conteúdo</TableCell></TableRow>
            ) : (
              contents.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.section_key}</TableCell>
                  <TableCell>{c.title}</TableCell>
                  <TableCell><Switch checked={c.active} onCheckedChange={(v) => toggleActive.mutate({ id: c.id, active: v })} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(c); setFormOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir seção?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(c.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Seção' : 'Nova Seção'}</DialogTitle>
            <DialogDescription>Dados da seção de conteúdo</DialogDescription>
          </DialogHeader>
          <ContentForm initial={editing} onSave={(c: any) => saveMutation.mutate(c)} saving={saveMutation.isPending} onCancel={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContentForm({ initial, onSave, saving, onCancel }: any) {
  const [sectionKey, setSectionKey] = useState(initial?.section_key || '');
  const [title, setTitle] = useState(initial?.title || '');
  const [subtitle, setSubtitle] = useState(initial?.subtitle || '');
  const [body, setBody] = useState(initial?.body || '');
  const [ctaLabel, setCtaLabel] = useState(initial?.cta_label || '');
  const [ctaLink, setCtaLink] = useState(initial?.cta_link || '');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ id: initial?.id, section_key: sectionKey, title, subtitle, body, cta_label: ctaLabel, cta_link: ctaLink, active: initial?.active ?? true }); }} className="space-y-3">
      <div><Label>Chave da seção *</Label><Input value={sectionKey} onChange={e => setSectionKey(e.target.value)} required disabled={!!initial} placeholder="hero, about, how-it-works..." /></div>
      <div><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
      <div><Label>Subtítulo</Label><Input value={subtitle} onChange={e => setSubtitle(e.target.value)} /></div>
      <div><Label>Corpo</Label><Textarea value={body} onChange={e => setBody(e.target.value)} rows={4} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>CTA Label</Label><Input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} /></div>
        <div><Label>CTA Link</Label><Input value={ctaLink} onChange={e => setCtaLink(e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}

function FaqSection() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { toast } = useToast();
  const { log } = useAdminLog();
  const queryClient = useQueryClient();

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['admin-faqs'],
    queryFn: async () => {
      const { data } = await supabase.from('faq_items').select('*').order('order_index');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (item: any) => {
      if (item.id) {
        const { error } = await supabase.from('faq_items').update({ question: item.question, answer: item.answer, order_index: item.order_index, active: item.active }).eq('id', item.id);
        if (error) throw error;
        await log('UPDATE', 'faq', item.id, `Edited FAQ`);
      } else {
        const { error } = await supabase.from('faq_items').insert(item);
        if (error) throw error;
        await log('CREATE', 'faq', undefined, `Created FAQ`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      setFormOpen(false);
      setEditing(null);
      toast({ title: 'FAQ salva' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faq_items').delete().eq('id', id);
      if (error) throw error;
      await log('DELETE', 'faq', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      toast({ title: 'FAQ excluída' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('faq_items').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-faqs'] }),
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Nova FAQ</Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Pergunta</TableHead>
              <TableHead>Ativa</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : faqs.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma FAQ</TableCell></TableRow>
            ) : (
              faqs.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="text-muted-foreground">{f.order_index}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{f.question}</TableCell>
                  <TableCell><Switch checked={f.active} onCheckedChange={(v) => toggleActive.mutate({ id: f.id, active: v })} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(f); setFormOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir FAQ?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(f.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar FAQ' : 'Nova FAQ'}</DialogTitle>
            <DialogDescription>Dados da pergunta frequente</DialogDescription>
          </DialogHeader>
          <FaqForm initial={editing} onSave={(f: any) => saveMutation.mutate(f)} saving={saveMutation.isPending} onCancel={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FaqForm({ initial, onSave, saving, onCancel }: any) {
  const [question, setQuestion] = useState(initial?.question || '');
  const [answer, setAnswer] = useState(initial?.answer || '');
  const [orderIndex, setOrderIndex] = useState(initial?.order_index ?? 0);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ id: initial?.id, question, answer, order_index: orderIndex, active: initial?.active ?? true }); }} className="space-y-3">
      <div><Label>Pergunta *</Label><Input value={question} onChange={e => setQuestion(e.target.value)} required /></div>
      <div><Label>Resposta *</Label><Textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={4} required /></div>
      <div><Label>Ordem</Label><Input type="number" value={orderIndex} onChange={e => setOrderIndex(Number(e.target.value))} /></div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
