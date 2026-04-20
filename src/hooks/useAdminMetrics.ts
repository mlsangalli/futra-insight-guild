import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_STALE } from '@/lib/query-config';

export function useAdminMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics-overview'],
    queryFn: async () => {
      const [users, markets, predictions, events24h] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('markets').select('id', { count: 'exact', head: true }),
        supabase.from('predictions').select('id', { count: 'exact', head: true }),
        supabase.from('analytics_events' as any)
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      ]);

      return {
        totalUsers: users.count ?? 0,
        totalMarkets: markets.count ?? 0,
        totalPredictions: predictions.count ?? 0,
        events24h: events24h.count ?? 0,
      };
    },
    staleTime: QUERY_STALE.medium,
  });
}
