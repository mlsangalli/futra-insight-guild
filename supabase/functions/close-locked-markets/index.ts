import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    // Log each closure
    for (const m of markets) {
      await adminClient.from("admin_logs").insert({
        admin_user_id: "00000000-0000-0000-0000-000000000000",
        action_type: "auto_close_locked",
        entity_type: "market",
        entity_id: m.id,
        description: `Auto-closed locked market: ${m.question}`,
      });
    }

    return new Response(JSON.stringify({ closed: markets.length, ids }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
