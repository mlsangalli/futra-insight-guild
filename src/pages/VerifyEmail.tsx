import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error('Email not found.');
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Email resent! Check your inbox.');
    }
  };

  return (
    <Layout hideFooter>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="rounded-xl border border-border bg-card p-8 space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Verify your email</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                We sent a confirmation link to{' '}
                {email ? <span className="text-foreground font-medium">{email}</span> : 'your email'}.
                Click the link to activate your account.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={resending || !email}
              >
                {resending ? 'Resending...' : 'Resend email'}
              </Button>

              <Link to="/login" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </div>

            <p className="text-xs text-muted-foreground">
              Didn't receive it? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
