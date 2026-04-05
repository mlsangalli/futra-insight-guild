import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
      navigate('/dashboard');
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message || 'Google sign-in failed');
    }
  };

  return (
    <Layout hideFooter>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold gradient-primary-text">FUTRA</h1>
            <p className="text-muted-foreground mt-2">Welcome back</p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 bg-surface-800" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Password</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 bg-surface-800" required />
            </div>
            <Button type="submit" className="w-full gradient-primary border-0" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
              Sign in with Google
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
            </p>
          </form>
        </div>
      </div>
    </Layout>
  );
}
