import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Market, MarketOption } from '@/types';

function parseRow(row: any): Market {
  const rawOptions = row.market_options || row.options || [];
  const options: MarketOption[] = rawOptions.map((o: any) => ({
    id: o.id, label: o.label,
    votes: o.total_votes ?? o.votes ?? 0,
    creditsAllocated: o.total_credits ?? o.creditsAllocated ?? 0,
    percentage: Number(o.percentage) || 0,
  }));
  return { ...row, options };
}

export function useSearchMarkets(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      
      // Try full-text search first
      const { data, error } = await supabase
        .from('markets')
        .select('*, market_options(*)')
        .textSearch('search_vector', query.trim().split(/\s+/).join(' & '), { type: 'plain' })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !data?.length) {
        // Fallback to ilike
        const { data: fallback, error: err2 } = await supabase
          .from('markets')
          .select('*, market_options(*)')
          .or(`question.ilike.%${query}%,description.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(20);
        if (err2) throw err2;
        return (fallback || []).map(parseRow);
      }
      return data.map(parseRow);
    },
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
  });
}
