import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

type EventName =
  | 'page_view'
  | 'market_view'
  | 'prediction_placed'
  | 'share_clicked'
  | 'signup_started'
  | 'signup_completed'
  | 'daily_bonus_claimed'
  | 'search_performed';

interface AnalyticsEvent {
  event: EventName;
  properties?: Record<string, string | number | boolean>;
}

export async function trackEvent({ event, properties }: AnalyticsEvent) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('analytics_events' as any).insert({
      event_name: event,
      user_id: session?.user?.id ?? null,
      properties: properties ?? {},
      url: window.location.pathname,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    // Analytics nunca deve bloquear a UX — falha silenciosamente
    logger.error('Analytics event failed', { event, error });
  }
}
