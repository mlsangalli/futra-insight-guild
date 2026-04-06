import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MarketOption {
  id: string;
  label: string;
  votes: number;
  creditsAllocated: number;
  percentage: number;
}

export interface DbMarket {
  id: string;
  question: string;
  description: string;
  category: string;
  type: string;
  status: string;
  options: MarketOption[];
  total_participants: number;
  total_credits: number;
  end_date: string;
  created_at: string;
  resolution_source: string | null;
  resolution_rules: string | null;
  featured: boolean;
  trending: boolean;
  created_by: string | null;
  lock_date: string | null;
  resolved_option: string | null;
}

function parseMarket(row: any): DbMarket {
  return {
    ...row,
    options: (row.options as any[]) || [],
  };
}

const PAGE_SIZE = 18;

export function useMarkets(filters?: { category?: string; featured?: boolean; trending?: boolean; status?: string }) {
  return useQuery({
    queryKey: ['markets', filters],
    queryFn: async () => {
      let query = supabase.from('markets').select('*');
      if (filters?.category) query = query.eq('category', filters.category as any);
      if (filters?.featured) query = query.eq('featured', true);
      if (filters?.trending) query = query.eq('trending', true);
      if (filters?.status) query = query.eq('status', filters.status as any);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(parseMarket);
    },
  });
}

export type SortOption = 'Trending' | 'Popular' | 'Newest' | 'Ending Soon';

export function useInfiniteMarkets(filters?: { category?: string; sort?: SortOption }) {
  return useInfiniteQuery({
    queryKey: ['markets-infinite', filters],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase.from('markets').select('*');
      if (filters?.category) query = query.eq('category', filters.category as any);

      const sort = filters?.sort || 'Newest';
      if (sort === 'Trending') query = query.order('trending', { ascending: false }).order('created_at', { ascending: false });
      else if (sort === 'Popular') query = query.order('total_participants', { ascending: false });
      else if (sort === 'Ending Soon') query = query.order('end_date', { ascending: true });
      else query = query.order('created_at', { ascending: false });

      const from = pageParam * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(parseMarket);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
  });
}

export function useMarket(id: string) {
  return useQuery({
    queryKey: ['market', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('markets').select('*').eq('id', id).single();
      if (error) throw error;
      return parseMarket(data);
    },
    enabled: !!id,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('futra_score', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useProfile(username: string) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!username,
  });
}

export function useUserPredictions(userId?: string) {
  return useQuery({
    queryKey: ['predictions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*, markets(*)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}
