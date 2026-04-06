/**
 * Extracted query functions for markets — reusable in hooks and prefetch.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Market, MarketOption } from '@/types';

function parseMarketRow(row: any): Market {
  const rawOptions = row.market_options || row.options || [];
  const options: MarketOption[] = rawOptions.map((o: any) => ({
    id: o.id,
    label: o.label,
    votes: o.total_votes ?? o.votes ?? 0,
    creditsAllocated: o.total_credits ?? o.creditsAllocated ?? 0,
    percentage: Number(o.percentage) || 0,
  }));
  return { ...row, options };
}

export async function fetchMarkets(filters?: {
  category?: string;
  featured?: boolean;
  trending?: boolean;
  status?: string;
}): Promise<Market[]> {
  let query = supabase.from('markets').select('*, market_options(*)');
  if (filters?.category) query = query.eq('category', filters.category as any);
  if (filters?.featured) query = query.eq('featured', true);
  if (filters?.trending) query = query.eq('trending', true);
  if (filters?.status) query = query.eq('status', filters.status as any);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(parseMarketRow);
}

export async function fetchMarketById(id: string): Promise<Market> {
  const { data, error } = await supabase
    .from('markets')
    .select('*, market_options(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return parseMarketRow(data);
}

export async function fetchLeaderboard() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('futra_score', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function fetchProfile(username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchUserPredictions(userId: string) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*, markets(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
