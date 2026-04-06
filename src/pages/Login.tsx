import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { SEO } from '@/components/SEO';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email é obrigatório').email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.errors.forEach(e => {
        const field = e.path[0] as keyof FieldErrors;
        if (!fieldErrors[field]) fieldErrors[field] = e.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'Email ou senha incorretos'
        : error.message);
    } else {
      toast.success('Bem-vindo de volta!');
      navigate('/dashboard');
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao entrar com Google');
    }
  };

  return (
    <Layout hideFooter>
      <SEO title="Entrar" description="Acesse sua conta FUTRA." />
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold gradient-primary-text">FUTRA</h1>
            <p className="text-muted-foreground mt-2">Bem-vindo de volta</p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                placeholder="voce@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
                className={`mt-1 bg-surface-800 ${errors.email ? 'border-destructive' : ''}`}
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Senha</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
                className={`mt-1 bg-surface-800 ${errors.password ? 'border-destructive' : ''}`}
              />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full gradient-primary border-0" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <p className="text-xs text-center">
              <Link to="/forgot-password" className="text-primary hover:underline">Esqueceu a senha?</Link>
            </p>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
              Entrar com Google
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Não tem conta? <Link to="/signup" className="text-primary hover:underline">Criar conta</Link>
            </p>
          </form>
        </div>
      </div>
    </Layout>
  );
}
