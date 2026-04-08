import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const VALID_ACTIONS = [
  "promote_admin", "demote_admin", "delete_market",
  "update_market_status", "toggle_featured", "toggle_trending",
  "schedule_lock", "resolve_market",
  "approve_candidate", "reject_candidate",
] as const;

type ActionType = typeof VALID_ACTIONS[number];

function validateUUID(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limit: 10 req/min per IP
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(clientIp, 10, 60_000);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Validate action type
    if (!action || !VALID_ACTIONS.includes(action as ActionType)) {
      return new Response(JSON.stringify({ error: `Invalid action. Valid actions: ${VALID_ACTIONS.join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: unknown = null;

    switch (action as ActionType) {
      case "promote_admin": {
        const { user_id } = body;
        if (!validateUUID(user_id)) return errResponse("Valid user_id (UUID) required", 400);
        const { error } = await adminClient.from("user_roles").insert({ user_id, role: "admin" });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "demote_admin": {
        const { user_id } = body;
        if (!validateUUID(user_id)) return errResponse("Valid user_id (UUID) required", 400);
        if (user_id === user.id) return errResponse("Cannot remove own admin role", 400);
        const { error } = await adminClient.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "delete_market": {
        const { market_id } = body;
        if (!validateUUID(market_id)) return errResponse("Valid market_id (UUID) required", 400);
        const { error } = await adminClient.from("markets").delete().eq("id", market_id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "update_market_status": {
        const { market_id, status } = body;
        if (!validateUUID(market_id)) return errResponse("Valid market_id (UUID) required", 400);
        if (!status || !["open", "closed"].includes(status)) return errResponse("Valid status required (open, closed). Use resolve_market action to resolve.", 400);
        const { error } = await adminClient.from("markets").update({ status }).eq("id", market_id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "toggle_featured": {
        const { market_id, featured } = body;
        if (!validateUUID(market_id)) return errResponse("Valid market_id (UUID) required", 400);
        const { error } = await adminClient.from("markets").update({ featured: !!featured }).eq("id", market_id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "toggle_trending": {
        const { market_id, trending } = body;
        if (!validateUUID(market_id)) return errResponse("Valid market_id (UUID) required", 400);
        const { error } = await adminClient.from("markets").update({ trending: !!trending }).eq("id", market_id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "schedule_lock": {
        const { market_id, lock_date } = body;
        if (!validateUUID(market_id)) return errResponse("Valid market_id (UUID) required", 400);
        if (lock_date) {
          const d = new Date(lock_date);
          if (isNaN(d.getTime())) return errResponse("Invalid lock_date", 400);
          if (d <= new Date()) return errResponse("lock_date must be in the future", 400);
        }
        const { error } = await adminClient.from("markets").update({ lock_date: lock_date || null }).eq("id", market_id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "resolve_market": {
        const { market_id, winning_option } = body;
        if (!validateUUID(market_id)) return errResponse("Valid market_id (UUID) required", 400);
        if (!winning_option) return errResponse("winning_option required", 400);

        // Use the canonical RPC — same path as automatic resolution
        const { data: rpcResult, error: rpcError } = await adminClient.rpc("resolve_market_and_score", {
          p_market_id: market_id,
          p_winning_option: winning_option,
        });

        if (rpcError) {
          return errResponse(rpcError.message, 400);
        }

        result = rpcResult;
        break;
      }
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
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function errResponse(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
