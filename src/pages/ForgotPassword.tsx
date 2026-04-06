import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Informe seu email');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <Layout hideFooter>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold gradient-primary-text">FUTRA</h1>
            <p className="text-muted-foreground mt-2">Recuperar senha</p>
          </div>

          {sent ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
              <Mail className="h-12 w-12 text-primary mx-auto" />
              <h2 className="font-display font-bold text-foreground text-lg">Email enviado!</h2>
              <p className="text-sm text-muted-foreground">
                Enviamos um link de recuperação para <span className="text-foreground font-medium">{email}</span>. Verifique sua caixa de entrada e spam.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/login"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1 bg-surface-800"
                />
              </div>
              <Button type="submit" className="w-full gradient-primary border-0" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                <Link to="/login" className="text-primary hover:underline">Voltar ao login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
