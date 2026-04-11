import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const VALID_ACTIONS = [
  "promote_admin", "demote_admin", "delete_market",
  "update_market_status", "toggle_featured", "toggle_trending",
  "schedule_lock", "resolve_market",
  "approve_candidate", "reject_candidate", "edit_market",
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

      case "approve_candidate": {
        const { candidate_id, question, description, category, end_date, options, resolution_source: res_source } = body;
        if (!validateUUID(candidate_id)) return errResponse("Valid candidate_id (UUID) required", 400);

        // Fetch candidate
        const { data: candidate, error: candErr } = await adminClient
          .from("scheduled_markets")
          .select("*")
          .eq("id", candidate_id)
          .single();

        if (candErr || !candidate) return errResponse("Candidate not found", 404);
        if (candidate.status === "published") return errResponse("Already published", 400);

        const finalQuestion = question || candidate.generated_question;
        const finalDescription = description || candidate.generated_description || "";
        const finalCategory = category || candidate.category;
        const finalEndDate = end_date || candidate.end_date || new Date(Date.now() + 7 * 86400000).toISOString();
        const finalOptions = options || candidate.generated_options || [];
        const finalResSource = res_source || candidate.resolution_source || "";

        if (!finalQuestion) return errResponse("Question is required", 400);

        // Check for duplicate market
        const { data: existing } = await adminClient
          .from("markets")
          .select("id")
          .ilike("question", `%${finalQuestion.substring(0, 50)}%`)
          .limit(1);

        if (existing && existing.length > 0) {
          return errResponse(`Similar market already exists: ${existing[0].id}`, 409);
        }

        // Insert into markets
        const optionsPayload = Array.isArray(finalOptions)
          ? finalOptions.map((o: any) => ({ label: typeof o === "string" ? o : o.label }))
          : [];

        const { data: market, error: marketErr } = await adminClient
          .from("markets")
          .insert({
            question: finalQuestion,
            description: finalDescription,
            category: finalCategory,
            type: optionsPayload.length === 2 ? "binary" : "multiple",
            options: optionsPayload,
            end_date: finalEndDate,
            status: "open",
            resolution_source: finalResSource,
            resolution_rules: finalResSource ? `Fonte: ${finalResSource}` : "",
            created_by: user.id,
          })
          .select("id")
          .single();

        if (marketErr) throw marketErr;

        // Update candidate status
        await adminClient
          .from("scheduled_markets")
          .update({
            status: "published",
            market_id: market.id,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            generated_question: finalQuestion,
          })
          .eq("id", candidate_id);

        result = { success: true, market_id: market.id };
        break;
      }

      case "reject_candidate": {
        const { candidate_id } = body;
        if (!validateUUID(candidate_id)) return errResponse("Valid candidate_id (UUID) required", 400);

        const { error: rejErr } = await adminClient
          .from("scheduled_markets")
          .update({
            status: "rejected",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", candidate_id);

        if (rejErr) throw rejErr;
        result = { success: true };
        break;
      }

      case "edit_market": {
        const { market_id, question, description, category, end_date, resolution_rules, resolution_source, options } = body;
        if (!validateUUID(market_id)) return errResponse("Valid market_id (UUID) required", 400);

        // Build update payload with only provided fields
        const updatePayload: Record<string, unknown> = {};
        if (question !== undefined) updatePayload.question = question;
        if (description !== undefined) updatePayload.description = description;
        if (category !== undefined) updatePayload.category = category;
        if (end_date !== undefined) updatePayload.end_date = end_date;
        if (resolution_rules !== undefined) updatePayload.resolution_rules = resolution_rules;
        if (resolution_source !== undefined) updatePayload.resolution_source = resolution_source;

        if (Object.keys(updatePayload).length > 0) {
          const { error: updateErr } = await adminClient.from("markets").update(updatePayload).eq("id", market_id);
          if (updateErr) throw updateErr;
        }

        // Handle options: update existing, insert new, delete removed
        if (Array.isArray(options)) {
          // Get current options
          const { data: currentOpts } = await adminClient
            .from("market_options")
            .select("id")
            .eq("market_id", market_id);
          const currentIds = new Set((currentOpts || []).map((o: any) => o.id));
          const incomingIds = new Set(options.filter((o: any) => o.id).map((o: any) => o.id));

          // Delete removed options (only those with no votes)
          for (const existingId of currentIds) {
            if (!incomingIds.has(existingId)) {
              const { error: delErr } = await adminClient
                .from("market_options")
                .delete()
                .eq("id", existingId)
                .eq("market_id", market_id)
                .eq("total_votes", 0);
              if (delErr) throw delErr;
            }
          }

          // Update existing and insert new
          for (const opt of options) {
            if (opt.id && currentIds.has(opt.id)) {
              // Update label
              const { error: optErr } = await adminClient
                .from("market_options")
                .update({ label: opt.label })
                .eq("id", opt.id)
                .eq("market_id", market_id);
              if (optErr) throw optErr;
            } else if (opt.label) {
              // Insert new option
              const { error: insErr } = await adminClient
                .from("market_options")
                .insert({ market_id, label: opt.label, total_votes: 0, total_credits: 0, percentage: 0 });
              if (insErr) throw insErr;
            }
          }
        }

        result = { success: true };
        break;
      }
    }

    // Log the action
    await adminClient.from("admin_logs").insert({
      admin_user_id: user.id,
      action_type: action,
      entity_type: body.entity_type || action.split("_").slice(1).join("_"),
      entity_id: body.market_id || body.user_id || null,
      description: body.description_log || body.description || `Admin action: ${action}`,
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
