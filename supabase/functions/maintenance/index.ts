import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { captureException } from "../_shared/sentry.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 86400000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    // 1. Archive old read notifications (>90 days)
    const { count: notifCount } = await admin
      .from("notifications")
      .delete({ count: "exact" })
      .eq("read", true)
      .lt("created_at", ninetyDaysAgo);

    // 2. Clean old admin_logs (>180 days)
    const { count: logsCount } = await admin
      .from("admin_logs")
      .delete({ count: "exact" })
      .lt("created_at", sixMonthsAgo);

    // 3. Prune old scheduled_markets with status 'created' (>30 days)
    const { count: scheduledCount } = await admin
      .from("scheduled_markets")
      .delete({ count: "exact" })
      .eq("status", "created")
      .lt("created_at", thirtyDaysAgo);

    // 4. Clean orphan push_subscriptions (no update in 90 days)
    const { count: pushCount } = await admin
      .from("push_subscriptions")
      .delete({ count: "exact" })
      .lt("updated_at", ninetyDaysAgo);

    const result = {
      notifications_deleted: notifCount ?? 0,
      admin_logs_deleted: logsCount ?? 0,
      scheduled_markets_pruned: scheduledCount ?? 0,
      push_subscriptions_cleaned: pushCount ?? 0,
      executed_at: now.toISOString(),
    };

    // Track in analytics_events
    await admin.from("analytics_events").insert({
      event_name: "maintenance_completed",
      properties: result,
    });

    console.log("Maintenance completed:", result);

    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (error) {
    console.error("Maintenance error:", error);
    await captureException(error as Error, { functionName: "maintenance" });
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers },
    );
  }
});
