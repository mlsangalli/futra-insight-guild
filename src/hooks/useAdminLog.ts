import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useAdminLog() {
  const { user } = useAuth();

  const log = async (actionType: string, entityType: string, entityId?: string, description?: string) => {
    if (!user) return;
    await supabase.from('admin_logs').insert({
      admin_user_id: user.id,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId || null,
      description: description || `${actionType} ${entityType}`,
    });
  };

  return { log };
}
