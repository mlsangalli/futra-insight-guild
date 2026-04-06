/**
 * Structured logger for FUTRA
 * Logs to console in dev, prepared for external service integration.
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
  }

  // Future: send to external service (Sentry, LogRocket, etc.)
  // if (externalLogger) externalLogger.send(entry);
}

export const logger = {
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
};
