import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MissionWithProgress {
  id: string;
  user_mission_id: string | null;
  action_type: string;
  title: string;
  description: string;
  period: string;
  goal_value: number;
  reward_credits: number;
  reward_score: number;
  current_value: number;
  completed: boolean;
  claimed_at: string | null;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

export function useMissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['missions', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MissionWithProgress[]> => {
      // Fetch all active missions
      const { data: missions, error: mErr } = await supabase
        .from('missions')
        .select('*')
        .eq('active', true)
        .order('period')
        .order('reward_credits', { ascending: false });

      if (mErr) throw mErr;

      const today = getToday();
      const weekStart = getWeekStart();

      // Fetch user progress for current periods
      const { data: progress, error: pErr } = await supabase
        .from('user_missions')
        .select('*')
        .eq('user_id', user!.id)
        .in('period_start', [today, weekStart]);

      if (pErr) throw pErr;

      const progressMap = new Map(
        (progress || []).map((p: any) => [`${p.mission_id}_${p.period_start}`, p])
      );

      return (missions || []).map((m: any) => {
        const periodStart = m.period === 'daily' ? today : weekStart;
        const p = progressMap.get(`${m.id}_${periodStart}`);
        return {
          id: m.id,
          user_mission_id: p?.id || null,
          action_type: m.action_type,
          title: m.title,
          description: m.description,
          period: m.period,
          goal_value: m.goal_value,
          reward_credits: m.reward_credits,
          reward_score: m.reward_score,
          current_value: p?.current_value || 0,
          completed: p?.completed || false,
          claimed_at: p?.claimed_at || null,
        };
      });
    },
    staleTime: 30_000,
  });
}

export function useClaimMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userMissionId: string) => {
      const { data, error } = await supabase.rpc('claim_mission_reward', {
        p_user_mission_id: userMissionId,
      });
      if (error) throw error;
      return data as { success: boolean; reward_credits: number; reward_score: number };
    },
    onSuccess: (data: any) => {
      toast.success(`Recompensa resgatada! +${data.reward_credits} FC${data.reward_score > 0 ? `, +${data.reward_score} score` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['credit-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      toast.error('Erro ao resgatar recompensa');
    },
  });
}

export interface MissionHistoryItem {
  id: string;
  title: string;
  period: string;
  reward_credits: number;
  reward_score: number;
  claimed_at: string;
}

export interface MissionStatsData {
  totalCompleted: number;
  totalCredits: number;
  totalScore: number;
}

export function useMissionHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mission-history', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MissionHistoryItem[]> => {
      const { data, error } = await supabase
        .from('user_missions')
        .select('id, claimed_at, mission_id, missions(title, period, reward_credits, reward_score)')
        .eq('user_id', user!.id)
        .not('claimed_at', 'is', null)
        .order('claimed_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        title: row.missions?.title || 'Missão',
        period: row.missions?.period || 'daily',
        reward_credits: row.missions?.reward_credits || 0,
        reward_score: row.missions?.reward_score || 0,
        claimed_at: row.claimed_at,
      }));
    },
    staleTime: 30_000,
  });
}

export function useMissionStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mission-stats', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MissionStatsData> => {
      const { data, error } = await supabase
        .from('user_missions')
        .select('mission_id, missions(reward_credits, reward_score)')
        .eq('user_id', user!.id)
        .not('claimed_at', 'is', null);

      if (error) throw error;

      const rows = data || [];
      return {
        totalCompleted: rows.length,
        totalCredits: rows.reduce((sum: number, r: any) => sum + (r.missions?.reward_credits || 0), 0),
        totalScore: rows.reduce((sum: number, r: any) => sum + (r.missions?.reward_score || 0), 0),
      };
    },
    staleTime: 30_000,
  });
}

export function useTrackMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ actionType, metadata }: { actionType: string; metadata?: Record<string, any> }) => {
      const { error } = await supabase.rpc('track_mission_progress', {
        p_action_type: actionType,
        p_metadata: metadata || {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      // Silently refresh missions
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}
