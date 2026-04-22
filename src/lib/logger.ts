/**
 * Structured logger for FUTRA
 * Em produção, errors são enviados para a tabela `analytics_events` (event_name = 'client_error')
 * para inspeção via SQL — substituível por Sentry quando disponível.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  route?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

const isDev = import.meta.env.DEV;

function formatEntry(entry: LogEntry): string {
  const ctx = entry.context ? ` | ${JSON.stringify(entry.context)}` : '';
  return `[${entry.level.toUpperCase()}] ${entry.message}${ctx}`;
}

/**
 * Best-effort remote sink. Lazy-imported to avoid pulling supabase into early
 * bundles, and dedupes within a short window to survive error storms.
 */
const recentRemote = new Map<string, number>();
const REMOTE_DEDUPE_MS = 30_000;

async function sendRemote(entry: LogEntry): Promise<void> {
  if (typeof window === 'undefined') return;
  const key = `${entry.level}:${entry.message}`;
  const now = Date.now();
  const last = recentRemote.get(key);
  if (last && now - last < REMOTE_DEDUPE_MS) return;
  recentRemote.set(key, now);
  // Garbage-collect occasionally so the map doesn't grow unbounded
  if (recentRemote.size > 50) {
    for (const [k, t] of recentRemote) {
      if (now - t > REMOTE_DEDUPE_MS) recentRemote.delete(k);
    }
  }
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return; // RLS exige usuário autenticado
    await supabase.from('analytics_events' as never).insert({
      event_name: 'client_error',
      user_id: data.session.user.id,
      properties: {
        level: entry.level,
        message: entry.message,
        ...(entry.context || {}),
      },
      url: window.location.pathname,
      user_agent: navigator.userAgent,
    } as never);
  } catch {
    /* never let telemetry break the app */
  }
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  if (isDev) {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
    fn(formatEntry(entry));
    return;
  }

  // Em produção: emite errors/warns para o console (capturado por SW/extensões)
  // e dispara telemetria assíncrona apenas para errors.
  if (level === 'error') {
    console.error(formatEntry(entry));
    void sendRemote(entry);
  } else if (level === 'warn') {
    console.warn(formatEntry(entry));
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
};
