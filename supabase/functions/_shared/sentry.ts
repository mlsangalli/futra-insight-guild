/**
 * Lightweight Sentry integration for Edge Functions.
 * Uses Sentry HTTP API (envelope endpoint) — no SDK dependency.
 */

interface SentryConfig {
  dsn: string;
  environment?: string;
  serverName?: string;
}

function parseDsn(dsn: string) {
  const url = new URL(dsn);
  const projectId = url.pathname.replace("/", "");
  const publicKey = url.username;
  const host = url.hostname;
  return { projectId, publicKey, host, protocol: url.protocol };
}

export async function captureException(
  error: Error | string,
  context?: Record<string, unknown>,
): Promise<void> {
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) return; // Silently skip if not configured

  try {
    const { projectId, publicKey, host, protocol } = parseDsn(dsn);
    const timestamp = Math.floor(Date.now() / 1000);
    const errorMessage = typeof error === "string" ? error : error.message;
    const errorType = typeof error === "string" ? "Error" : error.constructor.name;

    const eventId = crypto.randomUUID().replace(/-/g, "");

    const event = {
      event_id: eventId,
      timestamp,
      platform: "javascript",
      level: "error",
      server_name: context?.functionName || "edge-function",
      environment: Deno.env.get("ENVIRONMENT") || "production",
      exception: {
        values: [
          {
            type: errorType,
            value: errorMessage,
            stacktrace:
              typeof error !== "string" && error.stack
                ? {
                    frames: error.stack
                      .split("\n")
                      .slice(1, 10)
                      .map((line: string) => ({ filename: line.trim() })),
                  }
                : undefined,
          },
        ],
      },
      extra: context || {},
    };

    const header = JSON.stringify({
      event_id: eventId,
      sent_at: new Date().toISOString(),
      dsn,
    });
    const itemHeader = JSON.stringify({
      type: "event",
      content_type: "application/json",
    });
    const envelope = `${header}\n${itemHeader}\n${JSON.stringify(event)}`;

    const endpoint = `${protocol}//${host}/api/${projectId}/envelope/`;

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=edge-function/1.0`,
      },
      body: envelope,
    });
  } catch (e) {
    // Never let Sentry errors break the main flow
    console.error("Sentry capture failed:", e);
  }
}
