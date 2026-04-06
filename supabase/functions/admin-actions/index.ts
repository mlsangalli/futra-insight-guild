import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

function getInfluenceLevel(score: number): string {
  if (score >= 5000) return "elite";
  if (score >= 2000) return "high";
  if (score >= 500) return "medium";
  return "low";
}

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

      case "schedule_lock": {
        const { market_id, lock_date } = body;
        if (!market_id) throw new Error("market_id required");
        if (lock_date) {
          const d = new Date(lock_date);
          if (isNaN(d.getTime())) throw new Error("Invalid lock_date");
          if (d <= new Date()) throw new Error("lock_date must be in the future");
        }
        const { error } = await adminClient
          .from("markets")
          .update({ lock_date: lock_date || null })
          .eq("id", market_id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "resolve_market": {
        const { market_id, winning_option } = body;
        if (!market_id || !winning_option) throw new Error("market_id and winning_option required");

        // 1. Fetch market and validate
        const { data: market, error: mErr } = await adminClient
          .from("markets")
          .select("*")
          .eq("id", market_id)
          .single();
        if (mErr || !market) throw new Error("Market not found");
        if (market.status === "resolved") throw new Error("Market already resolved");

        const options = market.options as Array<{ id: string; label: string; votes: number; creditsAllocated: number }>;
        const validOption = options.find((o) => o.id === winning_option);
        if (!validOption) throw new Error("Invalid winning option");

        // 2. Fetch all predictions for this market
        const { data: predictions, error: pErr } = await adminClient
          .from("predictions")
          .select("*")
          .eq("market_id", market_id);
        if (pErr) throw pErr;

        const allPredictions = predictions || [];
        const totalPool = allPredictions.reduce((sum: number, p: any) => sum + p.credits_allocated, 0);
        const winners = allPredictions.filter((p: any) => p.selected_option === winning_option);
        const losers = allPredictions.filter((p: any) => p.selected_option !== winning_option);
        const totalWinningCredits = winners.reduce((sum: number, p: any) => sum + p.credits_allocated, 0);

        // Helper to update reputation for a user
        async function updateReputation(userId: string, isWinner: boolean, reward: number) {
          const { data: profile } = await adminClient
            .from("profiles")
            .select("futra_credits, resolved_predictions, total_predictions, streak")
            .eq("user_id", userId)
            .single();

          if (!profile) return;

          const newResolved = profile.resolved_predictions + 1;

          // Count total wins
          const { count: totalWins } = await adminClient
            .from("predictions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "won");

          const accuracyRate = newResolved > 0
            ? Math.round(((totalWins || 0) / newResolved) * 100 * 100) / 100
            : 0;

          // Calculate futra_score
          const futraScore = Math.round(newResolved * accuracyRate);

          // Calculate streak
          let newStreak = 0;
          if (isWinner) {
            // Check consecutive wins
            const { data: recentPreds } = await adminClient
              .from("predictions")
              .select("status")
              .eq("user_id", userId)
              .in("status", ["won", "lost"])
              .order("updated_at", { ascending: false })
              .limit(50);

            if (recentPreds) {
              newStreak = 0;
              for (const p of recentPreds) {
                if (p.status === "won") newStreak++;
                else break;
              }
            }
          }
          // If loser, streak = 0

          const influenceLevel = getInfluenceLevel(futraScore);

          const updateData: Record<string, any> = {
            resolved_predictions: newResolved,
            accuracy_rate: accuracyRate,
            futra_score: futraScore,
            streak: newStreak,
            influence_level: influenceLevel,
          };

          if (isWinner) {
            updateData.futra_credits = profile.futra_credits + reward;
          }

          await adminClient
            .from("profiles")
            .update(updateData)
            .eq("user_id", userId);
        }

        if (winners.length > 0 && totalPool > 0) {
          // 3a. Distribute rewards proportionally to winners
          for (const pred of winners) {
            const reward = Math.floor((pred.credits_allocated / totalWinningCredits) * totalPool);

            await adminClient
              .from("predictions")
              .update({ status: "won", reward })
              .eq("id", pred.id);

            await updateReputation(pred.user_id, true, reward);
          }

          // 3b. Mark losers
          for (const pred of losers) {
            await adminClient
              .from("predictions")
              .update({ status: "lost", reward: 0 })
              .eq("id", pred.id);

            await updateReputation(pred.user_id, false, 0);
          }
        } else if (allPredictions.length > 0) {
          // 3c. No winners — refund all participants
          for (const pred of allPredictions) {
            await adminClient
              .from("predictions")
              .update({ status: "lost", reward: 0 })
              .eq("id", pred.id);

            const { data: profile } = await adminClient
              .from("profiles")
              .select("futra_credits, resolved_predictions")
              .eq("user_id", pred.user_id)
              .single();

            if (profile) {
              await adminClient
                .from("profiles")
                .update({
                  futra_credits: profile.futra_credits + pred.credits_allocated,
                  resolved_predictions: profile.resolved_predictions + 1,
                })
                .eq("user_id", pred.user_id);
            }
          }
        }

        // 4. Update market status
        const { error: updateErr } = await adminClient
          .from("markets")
          .update({ status: "resolved", resolved_option: winning_option })
          .eq("id", market_id);
        if (updateErr) throw updateErr;

        // 5. Recalculate global ranks for ALL profiles
        await adminClient.rpc("recalculate_global_ranks" as any);

        result = {
          success: true,
          total_predictions: allPredictions.length,
          winners_count: winners.length,
          total_pool: totalPool,
          refunded: winners.length === 0 && allPredictions.length > 0,
        };
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
