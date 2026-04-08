import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES } from '@/types';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const marketSchema = z.object({
  question: z.string().trim()
    .min(10, 'A pergunta precisa ter pelo menos 10 caracteres')
    .max(200, 'A pergunta pode ter no máximo 200 caracteres'),
  category: z.string().min(1, 'Selecione uma categoria'),
  description: z.string().trim().max(500, 'Descrição pode ter no máximo 500 caracteres').optional(),
  resolutionSource: z.string().trim()
    .max(200, 'Fonte pode ter no máximo 200 caracteres')
    .optional(),
});

type FieldErrors = Partial<Record<'question' | 'category' | 'description' | 'resolutionSource', string>>;

async function hashQuestion(question: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`user_suggestion:${question.toLowerCase().trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function CreateMarketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [resolutionSource, setResolutionSource] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const clearError = (field: keyof FieldErrors) => {
    if (errors[field]) setErrors(p => ({ ...p, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = marketSchema.safeParse({ question, category, description: description || undefined, resolutionSource: resolutionSource || undefined });
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof FieldErrors;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    if (!user) {
      toast.error('Você precisa estar logado para sugerir um mercado.');
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      const topicHash = await hashQuestion(question);

      const { error } = await supabase.from('scheduled_markets' as any).insert({
        source: 'user_suggestion',
        source_topic: question.trim(),
        topic_hash: topicHash,
        category,
        status: 'new',
        generated_question: question.trim(),
        generated_description: description.trim() || '',
        generated_options: [],
        resolution_source: resolutionSource.trim() || '',
        submitted_by: user.id,
      } as any);

      if (error) {
        if (error.code === '23505') {
          toast.error('Uma sugestão semelhante já existe na fila.');
        } else {
          throw error;
        }
        return;
      }

      setSubmitted(true);
      toast.success('Sugestão enviada com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar sugestão.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold text-foreground">Sugerir mercado</h1>
          <p className="text-muted-foreground mt-3">Faça login para sugerir um mercado de previsão.</p>
          <Button variant="outline" className="mt-6" asChild>
            <Link to="/login">Fazer login</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (submitted) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Sugestão enviada!</h1>
          <p className="text-muted-foreground mt-3">
            Sua sugestão será analisada pela equipe. Se aprovada, ela aparecerá na plataforma em breve.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button variant="outline" asChild>
              <Link to="/browse"><ArrowLeft className="h-4 w-4 mr-2" /> Explorar mercados</Link>
            </Button>
            <Button onClick={() => { setSubmitted(false); setQuestion(''); setCategory(''); setDescription(''); setResolutionSource(''); }}>
              Sugerir outro
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Sugerir mercado</h1>
        <p className="text-muted-foreground mb-6">Sugira uma pergunta para a comunidade prever. A equipe revisará antes de publicar.</p>
        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6">
          <div>
            <label className="text-sm font-medium text-foreground">Pergunta *</label>
            <Input
              placeholder="X vai acontecer até a data Y?"
              value={question}
              onChange={e => { setQuestion(e.target.value); clearError('question'); }}
              className={`mt-1 bg-surface-800 ${errors.question ? 'border-destructive' : ''}`}
              maxLength={200}
            />
            {errors.question && <p className="text-xs text-destructive mt-1">{errors.question}</p>}
            <p className="text-xs text-muted-foreground mt-1 text-right">{question.length}/200</p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Categoria *</label>
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); clearError('category'); }}
              className={`w-full mt-1 rounded-lg bg-surface-800 border p-2.5 text-sm text-foreground ${errors.category ? 'border-destructive' : 'border-border'}`}
            >
              <option value="">Selecione uma categoria</option>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            {errors.category && <p className="text-xs text-destructive mt-1">{errors.category}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Descrição <span className="text-muted-foreground">(opcional)</span></label>
            <Textarea
              placeholder="Contexto ou justificativa para a pergunta..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-1 bg-surface-800"
              maxLength={500}
              rows={3}
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Fonte de resolução <span className="text-muted-foreground">(opcional)</span></label>
            <Input
              placeholder="Ex.: Dados oficiais do governo"
              value={resolutionSource}
              onChange={e => setResolutionSource(e.target.value)}
              className="mt-1 bg-surface-800"
              maxLength={200}
            />
          </div>
          <Button type="submit" className="w-full gradient-primary border-0" disabled={submitting}>
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Enviando...' : 'Enviar sugestão'}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
