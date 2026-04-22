import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isOnCooldown } from '@/lib/rate-limiter';
import { isSameBrazilDay } from '@/lib/date-br';

export function useDailyBonusEligibility() {
  const { profile } = useAuth();

  // Comparar em horário de São Paulo evita o bug em que o usuário resgata às
  // 22h BRT (>=01h UTC do dia seguinte) e não consegue resgatar no dia seguinte.
  const isEligible = !profile?.last_daily_bonus ||
    !isSameBrazilDay(profile.last_daily_bonus);

  const streak = profile?.streak || 0;
  const bonusAmount = Math.min(50 + (streak * 5), 100);

  return { isEligible, bonusAmount, streak };
}

export function useClaimDailyBonus() {
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (isOnCooldown('claim-daily-bonus', 5000)) {
        throw new Error('Bônus já resgatado. Aguarde.');
      }
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
