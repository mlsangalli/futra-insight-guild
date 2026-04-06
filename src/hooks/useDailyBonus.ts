import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useDailyBonusEligibility() {
  const { profile } = useAuth();
  
  const isEligible = !profile?.last_daily_bonus || 
    new Date(profile.last_daily_bonus).toDateString() !== new Date().toDateString();

  const streak = profile?.streak || 0;
  const bonusAmount = Math.min(50 + (streak * 5), 100);

  return { isEligible, bonusAmount, streak };
}

export function useClaimDailyBonus() {
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('claim-daily-bonus', {
        method: 'POST',
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`+${data.amount} créditos resgatados! 🎉`);
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['credit-transactions'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Não foi possível resgatar o bônus');
    },
  });
}
