import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(clientIp, 1, 60_000);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find open markets whose lock_date has passed
    const { data: markets, error: fetchErr } = await adminClient
      .from("markets")
      .select("id, question")
      .eq("status", "open")
      .not("lock_date", "is", null)
      .lte("lock_date", new Date().toISOString());

    if (fetchErr) throw fetchErr;

    if (!markets || markets.length === 0) {
      return new Response(JSON.stringify({ closed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = markets.map((m: any) => m.id);

    const { error: updateErr } = await adminClient
      .from("markets")
      .update({ status: "closed" })
      .in("id", ids);

    if (updateErr) throw updateErr;

    // Batch insert admin logs
    const logRows = markets.map((m: any) => ({
      admin_user_id: SYSTEM_USER_ID,
      action_type: "auto_close_locked",
      entity_type: "market",
      entity_id: m.id,
      description: `Auto-closed locked market: ${m.question}`,
    }));

    await adminClient.from("admin_logs").insert(logRows);

    return new Response(JSON.stringify({ closed: markets.length, ids }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
