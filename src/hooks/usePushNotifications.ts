import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const isConfigured = !!FIREBASE_CONFIG.apiKey && !!FIREBASE_CONFIG.projectId;

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if already subscribed
  useEffect(() => {
    if (!user) return;
    supabase
      .from('push_subscriptions' as any)
      .select('id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setIsSubscribed(!!(data && (data as any[]).length > 0));
      });
  }, [user]);

  const subscribe = useCallback(async () => {
    if (!user || !isConfigured || loading) return false;

    try {
      setLoading(true);

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      // Dynamically import firebase (tree-shaking)
      const { initializeApp, getApps } = await import('firebase/app');
      const { getMessaging, getToken } = await import('firebase/messaging');

      const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
      const messaging = getMessaging(app);

      // Register SW if not already
      let swRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      if (!swRegistration) {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      }

      // Aguarda o SW estar ativo e envia a config (necessário para onBackgroundMessage funcionar)
      await navigator.serviceWorker.ready;
      const activeWorker = swRegistration.active || swRegistration.waiting || swRegistration.installing;
      if (activeWorker) {
        activeWorker.postMessage({ type: 'FIREBASE_CONFIG', config: FIREBASE_CONFIG });
      }

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      });

      if (!token) return false;

      // Upsert token
      const { error } = await supabase
        .from('push_subscriptions' as any)
        .upsert(
          { user_id: user.id, fcm_token: token, updated_at: new Date().toISOString() } as any,
          { onConflict: 'fcm_token' }
        );

      if (error) {
        console.error('Error saving push token:', error);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Push subscription error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, loading]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase
        .from('push_subscriptions' as any)
        .delete()
        .eq('user_id', user.id);
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    isSupported: typeof Notification !== 'undefined' && 'serviceWorker' in navigator && isConfigured,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
  };
}
