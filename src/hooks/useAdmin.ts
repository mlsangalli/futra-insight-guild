import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook resiliente: retorna isAdmin=false se chamado fora do AuthProvider
 * (evita quebra em árvores de componentes lazy/Suspense durante HMR).
 */
export function useAdmin() {
  let user: { id: string } | null = null;
  let authLoading = false;
  try {
    const ctx = useAuth();
    user = ctx.user;
    authLoading = ctx.loading;
  } catch {
    // fora do AuthProvider — comportamento defensivo
    return { isAdmin: false, loading: false };
  }

  const { data: isAdmin = false, isLoading } = useQuery({
    queryKey: ['admin-role', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  return { isAdmin, loading: authLoading || isLoading };
}
