import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';

const signupSchema = z.object({
  username: z.string().trim()
    .min(3, 'Username precisa ter pelo menos 3 caracteres')
    .max(20, 'Username pode ter no máximo 20 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Apenas letras, números e underscores'),
  email: z.string().trim().min(1, 'Email é obrigatório').email('Email inválido'),
  password: z.string()
    .min(6, 'Senha precisa ter pelo menos 6 caracteres')
    .max(72, 'Senha pode ter no máximo 72 caracteres'),
});

type FieldErrors = Partial<Record<'username' | 'email' | 'password', string>>;

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const result = signupSchema.safeParse({ username, email, password });
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

  const clearError = (field: keyof FieldErrors) => {
    if (errors[field]) setErrors(p => ({ ...p, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await signUp(email.trim(), password, username.trim(), username.trim());
    setLoading(false);
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email já está cadastrado. Tente fazer login.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Conta criada! Verifique seu email para confirmar.');
      navigate('/dashboard');
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao cadastrar com Google');
    }
  };

  return (
    <Layout hideFooter>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold gradient-primary-text">FUTRA</h1>
            <p className="text-muted-foreground mt-2">Crie sua conta</p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Username</label>
              <Input
                placeholder="seu_username"
                value={username}
                onChange={e => { setUsername(e.target.value); clearError('username'); }}
                className={`mt-1 bg-surface-800 ${errors.username ? 'border-destructive' : ''}`}
                maxLength={20}
              />
              {errors.username && <p className="text-xs text-destructive mt-1">{errors.username}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); clearError('email'); }}
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
                onChange={e => { setPassword(e.target.value); clearError('password'); }}
                className={`mt-1 bg-surface-800 ${errors.password ? 'border-destructive' : ''}`}
              />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              {!errors.password && <p className="text-xs text-muted-foreground mt-1">Mínimo 6 caracteres</p>}
            </div>
            <Button type="submit" className="w-full gradient-primary border-0" disabled={loading}>
              {loading ? 'Criando...' : 'Cadastrar'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
              Cadastrar com Google
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
            </p>
            <p className="text-xs text-center text-muted-foreground">
              Você começará com 1.000 Futra Credits e Influência Baixa.
            </p>
          </form>
        </div>
      </div>
    </Layout>
  );
}
