import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, Loader2 } from '@/lib/icons';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    if (type === 'recovery') {
      setValidSession(true);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setValidSession(!!session);
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
      toast.success('Senha atualizada com sucesso!');
      setTimeout(() => navigate('/dashboard'), 2000);
    }
  };

  if (validSession === null) {
    return (
      <Layout hideFooter>
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!validSession) {
    return (
      <Layout hideFooter>
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <h1 className="font-display text-2xl font-bold text-foreground">Link inválido ou expirado</h1>
            <p className="text-muted-foreground">Solicite um novo link de recuperação de senha.</p>
            <Button variant="outline" onClick={() => navigate('/forgot-password')}>
              Solicitar novo link
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold gradient-primary-text">FUTRA</h1>
            <p className="text-muted-foreground mt-2">Definir nova senha</p>
          </div>

          {success ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-emerald mx-auto" />
              <h2 className="font-display font-bold text-foreground text-lg">Senha atualizada!</h2>
              <p className="text-sm text-muted-foreground">Redirecionando para o painel...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Nova senha</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="mt-1 bg-surface-800"
                />
                <p className="text-xs text-muted-foreground mt-1">Mínimo 6 caracteres</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Confirmar senha</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="mt-1 bg-surface-800"
                />
              </div>
              <Button type="submit" className="w-full gradient-primary border-0" disabled={loading}>
                {loading ? 'Atualizando...' : 'Atualizar senha'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
