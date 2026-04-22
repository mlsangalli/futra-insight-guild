/**
 * Extracted query functions for markets — reusable in hooks and prefetch.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { Market, MarketOption } from '@/types';

type MarketRow = Tables<'markets'> & {
  market_options: Tables<'market_options'>[];
};

function parseMarketRow(row: MarketRow): Market {
  const options: MarketOption[] = (row.market_options || []).map((opt) => ({
    id: opt.id,
    label: opt.label,
    votes: opt.total_votes ?? 0,
    creditsAllocated: opt.total_credits ?? 0,
    percentage: Number(opt.percentage ?? 0),
  }));
  return {
    id: row.id,
    question: row.question,
    description: row.description,
    category: row.category,
    type: row.type,
    status: row.status,
    options,
    total_participants: row.total_participants,
    total_credits: row.total_credits,
    end_date: row.end_date,
    created_at: row.created_at,
    resolution_source: row.resolution_source,
    resolution_rules: row.resolution_rules,
    featured: row.featured,
    trending: row.trending,
    created_by: row.created_by,
    lock_date: row.lock_date,
    resolved_option: row.resolved_option,
  };
}

/** Parse a flat market row from RPC (no nested market_options) */
function parseRpcMarket(row: any): Market {
  const rawOptions = row.options;
  const options: MarketOption[] = Array.isArray(rawOptions)
    ? rawOptions.map((opt: any) => ({
        id: opt.id || '',
        label: opt.label || '',
        votes: opt.votes ?? opt.total_votes ?? 0,
        creditsAllocated: opt.creditsAllocated ?? opt.credits_allocated ?? opt.total_credits ?? 0,
        percentage: Number(opt.percentage ?? 0),
      }))
    : [];
  return {
    id: row.id,
    question: row.question,
    description: row.description || '',
    category: row.category,
    type: row.type || 'binary',
    status: row.status,
    options,
    total_participants: row.total_participants ?? 0,
    total_credits: row.total_credits ?? 0,
    end_date: row.end_date,
    created_at: row.created_at,
    resolution_source: row.resolution_source || null,
    resolution_rules: row.resolution_rules || null,
    featured: row.featured ?? false,
    trending: row.trending ?? false,
    created_by: row.created_by || null,
    lock_date: row.lock_date || null,
    resolved_option: row.resolved_option || null,
  };
}

/** Home feeds — backend-scored sections */
export interface HomeFeeds {
  featured: Market[];
  trending: Market[];
  popular: Market[];
  ending_soon: Market[];
}

export async function fetchHomeFeeds(): Promise<HomeFeeds> {
  const { data, error } = await supabase.rpc('get_home_feeds');
  if (error) throw error;

  const raw = data as any;
  return {
    featured: (raw.featured || []).map(parseRpcMarket),
    trending: (raw.trending || []).map(parseRpcMarket),
    popular: (raw.popular || []).map(parseRpcMarket),
    ending_soon: (raw.ending_soon || []).map(parseRpcMarket),
  };
}

/** Browse with server-side sorting */
export async function fetchBrowseSorted(params: {
  sort?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Market[]; totalCount: number }> {
  const { data, error } = await supabase.rpc('get_browse_sorted', {
    p_sort: params.sort || 'trending',
    p_category: (params.category as any) || null,
    p_limit: params.limit || 20,
    p_offset: params.offset || 0,
  } as any);
  if (error) throw error;

  const rows = (data || []) as any[];
  // O RPC `get_browse_sorted` repete `total_count` em todas as linhas.
  // Quando rows está vazio mas há páginas anteriores, ainda assim totalCount precisa refletir
  // o total — nesse caso confiamos em que offset>0 só ocorre quando totalCount já era conhecido.
  const totalCount = rows.length > 0 && rows[0].total_count != null
    ? Number(rows[0].total_count)
    : 0;
  return {
    data: rows.map(parseRpcMarket),
    totalCount,
  };
}

/** Fetch markets with optional cursor pagination */
export async function fetchMarkets(
  filters: {
    category?: string;
    featured?: boolean;
    trending?: boolean;
    status?: string;
    limit?: number;
    cursor?: string;
  } = {}
): Promise<{ data: Market[]; nextCursor: string | null }> {
  const pageSize = filters.limit ?? 20;

  let query = supabase
    .from('markets')
    .select('*, market_options(*)')
    .order('created_at', { ascending: false })
    .limit(pageSize + 1);

  if (filters.category) query = query.eq('category', filters.category as any);
  if (filters.featured) query = query.eq('featured', true);
  if (filters.trending) query = query.eq('trending', true);
  if (filters.status) query = query.eq('status', filters.status as any);
  else query = query.neq('status', 'closed' as any);
  if (filters.cursor) query = query.lt('created_at', filters.cursor);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as MarketRow[];
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;

  return {
    data: items.map(parseMarketRow),
    nextCursor,
  };
}

/** Fetch all markets (non-paginated, legacy fallback) */
export async function fetchAllMarkets(filters?: {
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
  else query = query.neq('status', 'closed' as any);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as MarketRow[]).map(parseMarketRow);
}

export async function fetchMarketById(id: string): Promise<Market> {
  const { data, error } = await supabase
    .from('markets')
    .select('*, market_options(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return parseMarketRow(data as unknown as MarketRow);
}

export async function fetchLeaderboard(filters?: { period?: string; category?: string }) {
  const p_period = filters?.period || 'all';
  const p_category = filters?.category && filters.category !== 'all' ? filters.category as any : null;
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_period,
    p_category,
  });
  if (error) throw error;
  return data || [];
}

export async function fetchProfile(username: string) {
  const { data, error } = await supabase
    .rpc('get_public_profile', { p_username: username });
  if (error) throw error;
  if (!data || (data as any[]).length === 0) return null;
  return (data as any[])[0];
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
