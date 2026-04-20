/**
 * FUTRA Flow — feed priorizado, skips, sessions, conviction.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export interface FlowMarket {
  id: string;
  question: string;
  description: string;
  category: string;
  type: string;
  status: string;
  options: Array<{ id: string; label: string; percentage: number; votes: number; creditsAllocated: number }>;
  total_participants: number;
  total_credits: number;
  end_date: string;
  lock_date: string | null;
  created_at: string;
  image_url: string | null;
  image_alt: string | null;
  resolution_source: string | null;
  flow_score: number;
}

export function useFlowFeed(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['flow', 'feed', user?.id, limit],
    enabled: !!user,
    staleTime: 0,
    gcTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_flow_feed' as any, { p_limit: limit });
      if (error) throw error;
      return (data ?? []) as unknown as FlowMarket[];
    },
  });
}

export function useFlowStats(userId?: string) {
  const { user } = useAuth();
  const target = userId ?? user?.id;
  return useQuery({
    queryKey: ['flow', 'stats', target],
    enabled: !!target,
    staleTime: 1000 * 60,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_flow_stats' as any, {
        p_user_id: userId ?? null,
      });
      if (error) throw error;
      return data as Record<string, any>;
    },
  });
}

export function useRecordSkip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (marketId: string) => {
      const { error } = await supabase.rpc('record_flow_skip' as any, { p_market_id: marketId });
      if (error) throw error;
    },
    onSettled: () => {
      if (user) queryClient.invalidateQueries({ queryKey: ['flow', 'feed', user.id] });
    },
  });
}

export function useRecordConviction() {
  return useMutation({
    mutationFn: async ({ predictionId, level }: { predictionId: string; level: 'low' | 'medium' | 'high' }) => {
      const { error } = await supabase.rpc('record_prediction_conviction' as any, {
        p_prediction_id: predictionId,
        p_level: level,
      });
      if (error) throw error;
    },
    onError: (err) => logger.warn('Conviction record failed', { err: (err as Error).message }),
  });
}

interface SessionMetrics {
  cards_viewed?: number;
  cards_answered?: number;
  cards_skipped?: number;
  cards_shared?: number;
  total_credits_invested?: number;
}

export function useFlowSession() {
  const { user } = useAuth();

  const start = async (deviceType: 'mobile' | 'desktop' | 'unknown' = 'unknown') => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('flow_sessions' as any)
      .insert({ user_id: user.id, device_type: deviceType })
      .select('id')
      .single();
    if (error) {
      logger.warn('Flow session start failed', { err: error.message });
      return null;
    }
    return (data as any).id as string;
  };

  const update = async (sessionId: string | null, metrics: SessionMetrics) => {
    if (!sessionId) return;
    await supabase
      .from('flow_sessions' as any)
      .update(metrics)
      .eq('id', sessionId);
  };

  const end = async (sessionId: string | null, metrics: SessionMetrics) => {
    if (!sessionId) return;
    await supabase
      .from('flow_sessions' as any)
      .update({ ...metrics, ended_at: new Date().toISOString() })
      .eq('id', sessionId);
  };

  return { start, update, end };
}
