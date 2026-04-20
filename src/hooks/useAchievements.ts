import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_STALE } from '@/lib/query-config';

export function useUserAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-achievements', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('id, unlocked_at, achievement_id, achievements(id, key, name, description, icon, category, rarity)')
        .eq('user_id', userId!)
        .order('unlocked_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row.achievements,
        unlocked_at: row.unlocked_at,
      }));
    },
  });
}

export function useAllAchievements() {
  return useQuery({
    queryKey: ['all-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('active', true)
        .order('created_at');
      if (error) throw error;
      return data || [];
    },
    staleTime: QUERY_STALE.long,
  });
}
