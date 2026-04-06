import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    let result: unknown = null;

    switch (action) {
      case "promote_admin": {
        const { user_id } = body;
        if (!user_id) throw new Error("user_id required");
        const { error } = await adminClient
          .from("user_roles")
          .insert({ user_id, role: "admin" });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "demote_admin": {
        const { user_id } = body;
        if (!user_id) throw new Error("user_id required");
        if (user_id === user.id) throw new Error("Cannot remove own admin role via this action");
        const { error } = await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", user_id)
          .eq("role", "admin");
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "delete_market": {
        const { market_id } = body;
        if (!market_id) throw new Error("market_id required");
        const { error } = await adminClient
          .from("markets")
          .delete()
          .eq("id", market_id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "update_market_status": {
        const { market_id, status, resolved_option } = body;
        if (!market_id || !status) throw new Error("market_id and status required");
        const updateData: Record<string, unknown> = { status };
        if (resolved_option) updateData.resolved_option = resolved_option;
        const { error } = await adminClient
          .from("markets")
          .update(updateData)
          .eq("id", market_id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "toggle_featured": {
        const { market_id, featured } = body;
        if (!market_id) throw new Error("market_id required");
        const { error } = await adminClient
          .from("markets")
          .update({ featured: !!featured })
          .eq("id", market_id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "toggle_trending": {
        const { market_id, trending } = body;
        if (!market_id) throw new Error("market_id required");
        const { error } = await adminClient
          .from("markets")
          .update({ trending: !!trending })
          .eq("id", market_id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log the action
    await adminClient.from("admin_logs").insert({
      admin_user_id: user.id,
      action_type: action,
      entity_type: body.entity_type || action.split("_").slice(1).join("_"),
      entity_id: body.market_id || body.user_id || null,
      description: body.description || `Admin action: ${action}`,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
