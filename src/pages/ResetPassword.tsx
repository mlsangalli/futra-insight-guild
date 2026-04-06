import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, Loader2 } from 'lucide-react';

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
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
      toast.success('Password updated successfully!');
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
            <h1 className="font-display text-2xl font-bold text-foreground">Invalid or expired link</h1>
            <p className="text-muted-foreground">Please request a new password recovery link.</p>
            <Button variant="outline" onClick={() => navigate('/forgot-password')}>
              Request new link
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
            <p className="text-muted-foreground mt-2">Set new password</p>
          </div>

          {success ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-emerald mx-auto" />
              <h2 className="font-display font-bold text-foreground text-lg">Password updated!</h2>
              <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">New password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="mt-1 bg-surface-800"
                />
                <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Confirm password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="mt-1 bg-surface-800"
                />
              </div>
              <Button type="submit" className="w-full gradient-primary border-0" disabled={loading}>
                {loading ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
