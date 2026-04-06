import { useMutation, useQueryClient, MutationFunction } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseSupabaseError } from '@/lib/api-error';

interface UseOptimisticMutationOptions<TData, TVariables> {
  mutationFn: MutationFunction<TData, TVariables>;
  queryKey: unknown[];
  optimisticUpdate?: (old: TData | undefined, variables: TVariables) => TData;
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticMutation<TData, TVariables>({
  mutationFn,
  queryKey,
  optimisticUpdate,
  successMessage,
  errorMessage,
}: UseOptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      if (!optimisticUpdate) return;
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<TData>(queryKey);
      queryClient.setQueryData<TData>(queryKey, (old) =>
        optimisticUpdate(old, variables)
      );
      return { previousData };
    },
    onError: (error, _variables, context: any) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(errorMessage ?? parseSupabaseError(error));
    },
    onSuccess: () => {
      if (successMessage) toast.success(successMessage);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
