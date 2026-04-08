import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const VALID_ACTIONS = [
  "promote_admin", "demote_admin", "delete_market",
  "update_market_status", "toggle_featured", "toggle_trending",
  "schedule_lock", "resolve_market",
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
        const { market_id, status, resolved_option } = body;
        if (!validateUUID(market_id)) return errResponse("Valid market_id (UUID) required", 400);
        if (!status || !["open", "closed", "resolved"].includes(status)) return errResponse("Valid status required (open, closed, resolved)", 400);
        const updateData: Record<string, unknown> = { status };
        if (resolved_option) updateData.resolved_option = resolved_option;
        const { error } = await adminClient.from("markets").update(updateData).eq("id", market_id);
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

        const { data: market, error: mErr } = await adminClient.from("markets").select("*").eq("id", market_id).single();
        if (mErr || !market) return errResponse("Market not found", 404);
        if (market.status === "resolved") return errResponse("Market already resolved", 400);

        const options = market.options as Array<{ id: string; label: string; votes: number; creditsAllocated: number }>;
        if (!options.find((o) => o.id === winning_option)) return errResponse("Invalid winning option", 400);

        const { data: predictions, error: pErr } = await adminClient.from("predictions").select("*").eq("market_id", market_id);
        if (pErr) throw pErr;

        const allPredictions = predictions || [];
        const totalPool = allPredictions.reduce((sum: number, p: any) => sum + p.credits_allocated, 0);
        const winners = allPredictions.filter((p: any) => p.selected_option === winning_option);
        const losers = allPredictions.filter((p: any) => p.selected_option !== winning_option);
        const totalWinningCredits = winners.reduce((sum: number, p: any) => sum + p.credits_allocated, 0);

        async function updateReputation(userId: string, isWinner: boolean, reward: number) {
          const { data: profile } = await adminClient.from("profiles").select("futra_credits, resolved_predictions, total_predictions, streak").eq("user_id", userId).single();
          if (!profile) return;

          const newResolved = profile.resolved_predictions + 1;
          const { count: totalWins } = await adminClient.from("predictions").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "won");
          const accuracyRate = newResolved > 0 ? Math.round(((totalWins || 0) / newResolved) * 100 * 100) / 100 : 0;
          const futraScore = Math.round(newResolved * accuracyRate);

          let newStreak = 0;
          if (isWinner) {
            const { data: recentPreds } = await adminClient.from("predictions").select("status").eq("user_id", userId).in("status", ["won", "lost"]).order("updated_at", { ascending: false }).limit(50);
            if (recentPreds) {
              for (const p of recentPreds) {
                if (p.status === "won") newStreak++;
                else break;
              }
            }
          }

          const influenceLevel = getInfluenceLevel(futraScore);
          const updateData: Record<string, any> = { resolved_predictions: newResolved, accuracy_rate: accuracyRate, futra_score: futraScore, streak: newStreak, influence_level: influenceLevel };
          if (isWinner) updateData.futra_credits = profile.futra_credits + reward;
          await adminClient.from("profiles").update(updateData).eq("user_id", userId);
        }

        if (winners.length > 0 && totalPool > 0) {
          for (const pred of winners) {
            const reward = Math.floor((pred.credits_allocated / totalWinningCredits) * totalPool);
            await adminClient.from("predictions").update({ status: "won", reward }).eq("id", pred.id);
            await updateReputation(pred.user_id, true, reward);
          }
          for (const pred of losers) {
            await adminClient.from("predictions").update({ status: "lost", reward: 0 }).eq("id", pred.id);
            await updateReputation(pred.user_id, false, 0);
          }
        } else if (allPredictions.length > 0) {
          for (const pred of allPredictions) {
            await adminClient.from("predictions").update({ status: "lost", reward: 0 }).eq("id", pred.id);
            const { data: profile } = await adminClient.from("profiles").select("futra_credits, resolved_predictions").eq("user_id", pred.user_id).single();
            if (profile) {
              await adminClient.from("profiles").update({ futra_credits: profile.futra_credits + pred.credits_allocated, resolved_predictions: profile.resolved_predictions + 1 }).eq("user_id", pred.user_id);
            }
          }
        }

        // Insert notifications for all participants
        const notificationRows = allPredictions.map((pred: any) => {
          const isWinner = pred.selected_option === winning_option;
          const reward = isWinner && totalWinningCredits > 0
            ? Math.floor((pred.credits_allocated / totalWinningCredits) * totalPool)
            : 0;
          return {
            user_id: pred.user_id,
            type: 'result',
            title: isWinner ? '🎉 Você acertou!' : '❌ Não foi dessa vez',
            body: isWinner
              ? `Sua previsão no mercado "${market.question}" estava certa! Você ganhou ${reward} FC.`
              : `Sua previsão no mercado "${market.question}" não acertou. Continue tentando!`,
            data: { market_id: market_id, reward },
          };
        });

        if (notificationRows.length > 0) {
          await adminClient.from("notifications").insert(notificationRows);
        }

        await adminClient.from("markets").update({ status: "resolved", resolved_option: winning_option }).eq("id", market_id);
        await adminClient.rpc("recalculate_global_ranks" as any);

        result = { success: true, total_predictions: allPredictions.length, winners_count: winners.length, total_pool: totalPool, refunded: winners.length === 0 && allPredictions.length > 0 };
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
