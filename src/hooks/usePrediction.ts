/**
 * Typed mutation hooks for predictions
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreatePredictionPayload {
  marketId: string;
  selectedOption: string;
  credits: number;
}

export function useCreatePrediction() {
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async (payload: CreatePredictionPayload) => {
      const { data, error } = await supabase.rpc('place_prediction', {
        p_market_id: payload.marketId,
        p_selected_option: payload.selectedOption,
        p_credits: payload.credits,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      toast.success('Prediction confirmed!');
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      queryClient.invalidateQueries({ queryKey: ['market', variables.marketId] });
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['predictions', user.id] });
      }
      refreshProfile();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to place prediction');
    },
  });
}
