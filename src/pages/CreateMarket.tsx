import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES } from '@/data/types';
import { toast } from 'sonner';
import { z } from 'zod';

const marketSchema = z.object({
  question: z.string().trim()
    .min(10, 'A pergunta precisa ter pelo menos 10 caracteres')
    .max(200, 'A pergunta pode ter no máximo 200 caracteres'),
  category: z.string().min(1, 'Selecione uma categoria'),
  endDate: z.string().min(1, 'Data de encerramento é obrigatória')
    .refine(val => new Date(val) > new Date(), 'A data precisa ser no futuro'),
  resolutionSource: z.string().trim()
    .max(200, 'Fonte pode ter no máximo 200 caracteres')
    .optional(),
});

type FieldErrors = Partial<Record<'question' | 'category' | 'endDate' | 'resolutionSource', string>>;

export default function CreateMarketPage() {
  const [hasAccess] = useState(false);
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('');
  const [endDate, setEndDate] = useState('');
  const [resolutionSource, setResolutionSource] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const clearError = (field: keyof FieldErrors) => {
    if (errors[field]) setErrors(p => ({ ...p, [field]: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = marketSchema.safeParse({ question, category, endDate, resolutionSource: resolutionSource || undefined });
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
    toast.success('Market submitted for review!');
  };

  if (!hasAccess) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-surface-700 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Create a market</h1>
          <p className="text-muted-foreground mt-3">
            You need <span className="text-primary font-medium">High Influence</span> or above to create markets. Keep making accurate predictions to level up!
          </p>
          <div className="mt-6 rounded-lg bg-surface-800 p-4">
            <p className="text-sm text-muted-foreground">Your current level: <span className="text-foreground font-medium">Low Influence</span></p>
            <p className="text-sm text-muted-foreground mt-1">Required: <span className="text-emerald font-medium">High Influence</span></p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-6">Create a market</h1>
        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6">
          <div>
            <label className="text-sm font-medium text-foreground">Question</label>
            <Input
              placeholder="Will X happen by Y date?"
              value={question}
              onChange={e => { setQuestion(e.target.value); clearError('question'); }}
              className={`mt-1 bg-surface-800 ${errors.question ? 'border-destructive' : ''}`}
              maxLength={200}
            />
            {errors.question && <p className="text-xs text-destructive mt-1">{errors.question}</p>}
            <p className="text-xs text-muted-foreground mt-1 text-right">{question.length}/200</p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Category</label>
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); clearError('category'); }}
              className={`w-full mt-1 rounded-lg bg-surface-800 border p-2.5 text-sm text-foreground ${errors.category ? 'border-destructive' : 'border-border'}`}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            {errors.category && <p className="text-xs text-destructive mt-1">{errors.category}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">End date</label>
            <Input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); clearError('endDate'); }}
              className={`mt-1 bg-surface-800 ${errors.endDate ? 'border-destructive' : ''}`}
            />
            {errors.endDate && <p className="text-xs text-destructive mt-1">{errors.endDate}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Resolution source <span className="text-muted-foreground">(optional)</span></label>
            <Input
              placeholder="e.g., Official government data"
              value={resolutionSource}
              onChange={e => setResolutionSource(e.target.value)}
              className="mt-1 bg-surface-800"
              maxLength={200}
            />
          </div>
          <Button type="submit" className="w-full gradient-primary border-0">Submit for review</Button>
        </form>
      </div>
    </Layout>
  );
}
