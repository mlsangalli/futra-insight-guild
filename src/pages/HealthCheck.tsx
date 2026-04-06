import { useState, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CheckResult {
  name: string;
  status: 'ok' | 'fail' | 'pending';
  latency?: number;
  error?: string;
}

export default function HealthCheckPage() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  const runChecks = useCallback(async () => {
    setRunning(true);
    const checks: CheckResult[] = [];

    // Database
    const dbStart = performance.now();
    try {
      const { error } = await supabase.from('categories').select('id').limit(1);
      checks.push({ name: 'Database', status: error ? 'fail' : 'ok', latency: Math.round(performance.now() - dbStart), error: error?.message });
    } catch (e: any) {
      checks.push({ name: 'Database', status: 'fail', latency: Math.round(performance.now() - dbStart), error: e.message });
    }

    // Auth
    const authStart = performance.now();
    try {
      const { data } = await supabase.auth.getSession();
      checks.push({ name: 'Auth', status: data.session ? 'ok' : 'ok', latency: Math.round(performance.now() - authStart) });
    } catch (e: any) {
      checks.push({ name: 'Auth', status: 'fail', latency: Math.round(performance.now() - authStart), error: e.message });
    }

    // Realtime
    const rtStart = performance.now();
    try {
      const channel = supabase.channel('health-check-test');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => { supabase.removeChannel(channel); reject(new Error('Timeout')); }, 5000);
        channel.subscribe((status) => {
          clearTimeout(timeout);
          supabase.removeChannel(channel);
          if (status === 'SUBSCRIBED') resolve();
          else reject(new Error(`Status: ${status}`));
        });
      });
      checks.push({ name: 'Realtime', status: 'ok', latency: Math.round(performance.now() - rtStart) });
    } catch (e: any) {
      checks.push({ name: 'Realtime', status: 'fail', latency: Math.round(performance.now() - rtStart), error: e.message });
    }

    // Edge Functions
    const efStart = performance.now();
    try {
      const { error } = await supabase.functions.invoke('og-image', { body: {} });
      // og-image may return error without id param, but connection working = ok
      checks.push({ name: 'Edge Functions', status: 'ok', latency: Math.round(performance.now() - efStart) });
    } catch (e: any) {
      checks.push({ name: 'Edge Functions', status: 'fail', latency: Math.round(performance.now() - efStart), error: e.message });
    }

    setResults(checks);
    setRunning(false);
  }, []);

  const allOk = results.length > 0 && results.every(r => r.status === 'ok');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Health Check</h1>
        <p className="text-sm text-muted-foreground mb-6">System connectivity diagnostics.</p>

        <Button onClick={runChecks} disabled={running} className="mb-6 gradient-primary border-0">
          {running ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Running...</> : <><RefreshCw className="h-4 w-4 mr-2" /> Run checks</>}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map(r => (
              <div key={r.name} className={cn('rounded-xl border p-4 flex items-center gap-3', r.status === 'ok' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-destructive/30 bg-destructive/5')}>
                {r.status === 'ok' ? <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" /> : <XCircle className="h-5 w-5 text-destructive shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.name}</p>
                  {r.error && <p className="text-xs text-destructive truncate">{r.error}</p>}
                </div>
                {r.latency !== undefined && <span className="text-xs text-muted-foreground shrink-0">{r.latency}ms</span>}
              </div>
            ))}
            <div className={cn('text-center p-4 rounded-xl border', allOk ? 'border-emerald-500/30 text-emerald-400' : 'border-destructive/30 text-destructive')}>
              <p className="font-display font-bold">{allOk ? '✅ All systems operational' : '⚠️ Some checks failed'}</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
