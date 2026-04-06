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
      toast.error('Email não encontrado.');
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Email reenviado! Verifique sua caixa de entrada.');
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
              <h1 className="font-display text-2xl font-bold text-foreground">Verifique seu email</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Enviamos um link de confirmação para{' '}
                {email ? <span className="text-foreground font-medium">{email}</span> : 'seu email'}.
                Clique no link para ativar sua conta.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={resending || !email}
              >
                {resending ? 'Reenviando...' : 'Reenviar email'}
              </Button>

              <Link to="/login" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </Link>
            </div>

            <p className="text-xs text-muted-foreground">
              Não recebeu? Verifique a pasta de spam ou tente reenviar.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
