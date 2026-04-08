import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { captureException } from "../_shared/sentry.ts";

async function sendAlert(webhookUrl: string, text: string): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }), // Slack-compatible format
    });
  } catch (e) {
    console.error("Failed to send alert:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const jobStart = Date.now();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const alertWebhookUrl = Deno.env.get("ALERT_WEBHOOK_URL");
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 3600000).toISOString();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 3600000).toISOString();

    const alerts: string[] = [];

    // 1. Check for stuck markets (closed > 48h without resolution)
    const { data: stuckMarkets, error: stuckErr } = await admin
      .from("markets")
      .select("id, question")
      .eq("status", "closed")
      .lt("end_date", fortyEightHoursAgo);

    if (stuckErr) throw stuckErr;

    if (stuckMarkets && stuckMarkets.length > 0) {
      alerts.push(
        `🚨 ${stuckMarkets.length} mercado(s) preso(s) (closed >48h sem resolução): ${stuckMarkets.map((m: any) => m.question.substring(0, 50)).join(", ")}`,
      );
    }

    // 2. Check if auto-resolve cron ran in last 2h
    const { count: cronRuns } = await admin
      .from("admin_logs")
      .select("id", { count: "exact", head: true })
      .in("action_type", ["auto_close_locked", "auto_resolve_ai", "auto_resolve_skipped", "auto_resolve_error"])
      .gte("created_at", twoHoursAgo);

    // Only alert if there are closed markets that need resolution
    const { count: closedCount } = await admin
      .from("markets")
      .select("id", { count: "exact", head: true })
      .eq("status", "closed");

    if ((cronRuns ?? 0) === 0 && (closedCount ?? 0) > 0) {
      alerts.push(
        `⚠️ Cron de resolução não executou nas últimas 2h, mas há ${closedCount} mercado(s) fechado(s).`,
      );
    }

    // 3. Check for recent errors in admin_logs
    const { count: recentErrors } = await admin
      .from("admin_logs")
      .select("id", { count: "exact", head: true })
      .like("action_type", "%error%")
      .gte("created_at", twoHoursAgo);

    if ((recentErrors ?? 0) >= 5) {
      alerts.push(`🔥 ${recentErrors} erros nos admin_logs nas últimas 2h.`);
    }

    // Send alerts
    if (alerts.length > 0 && alertWebhookUrl) {
      const message = `[FUTRA Health Monitor] ${now.toISOString()}\n\n${alerts.join("\n\n")}`;
      await sendAlert(alertWebhookUrl, message);
    }

    const result = {
      status: alerts.length === 0 ? "healthy" : "alerts",
      alerts,
      stuck_markets: stuckMarkets?.length ?? 0,
      cron_runs_2h: cronRuns ?? 0,
      recent_errors_2h: recentErrors ?? 0,
      checked_at: now.toISOString(),
    };

    console.log("Health check:", result);

    // Log job execution
    await admin.from("job_executions").insert({
      job_name: "health-monitor",
      status: alerts.length === 0 ? "success" : "partial",
      duration_ms: Date.now() - jobStart,
      metrics: { alerts_count: alerts.length, stuck_markets: stuckMarkets?.length ?? 0, recent_errors: recentErrors ?? 0 },
    });

    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (error) {
    console.error("Health monitor error:", error);
    await captureException(error as Error, { functionName: "health-monitor" });
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers },
    );
  }
});
