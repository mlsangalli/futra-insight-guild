import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePublicPredictions(userId: string | undefined) {
  return useQuery({
    queryKey: ['public-predictions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('predictions')
        .select('*, markets(question, category, status, resolved_option)')
        .eq('user_id', userId)
        .in('status', ['won', 'lost'])
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}
