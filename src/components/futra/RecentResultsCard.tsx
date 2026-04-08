import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ShareButton, winShareText } from '@/components/futra/ShareButton';

export function RecentResultsCard() {
  const { user, profile } = useAuth();

  const { data: results } = useQuery({
    queryKey: ['recent-results', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('predictions')
        .select('id, market_id, status, credits_allocated, reward, score_delta, markets(question)')
        .eq('user_id', user.id)
        .in('status', ['won', 'lost'])
        .order('updated_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (!results || results.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Resultados recentes</h3>
      </div>
      <div className="space-y-2">
        {results.map((r: any) => {
          const won = r.status === 'won';
          const question = r.markets?.question || 'Mercado';
          const shareText = winShareText(
            question,
            won,
            r.reward || 0,
            Math.round(profile?.accuracy_rate || 0)
          );
          const shareUrl = `${window.location.origin}/market/${r.market_id}`;

          return (
            <div key={r.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <Link
                to={`/market/${r.market_id}`}
                className="flex items-start gap-2.5 flex-1 min-w-0"
              >
                {won
                  ? <CheckCircle className="h-4 w-4 text-emerald shrink-0 mt-0.5" />
                  : <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{question}</p>
                  <div className="flex gap-3 text-xs mt-0.5">
                    <span className={cn(won ? 'text-emerald' : 'text-destructive')}>
                      {won ? `+${r.reward}` : `-${r.credits_allocated}`} FC
                    </span>
                    {r.score_delta != null && (
                      <span className={cn(r.score_delta >= 0 ? 'text-emerald' : 'text-destructive')}>
                        {r.score_delta >= 0 ? '+' : ''}{r.score_delta} score
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              {won && (
                <ShareButton
                  title={question}
                  text={shareText}
                  url={shareUrl}
                  shareContext="win"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
