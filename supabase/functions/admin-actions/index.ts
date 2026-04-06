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

        // Validate winning_option exists in market options
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

        if (winners.length > 0 && totalPool > 0) {
          // 3a. Distribute rewards proportionally to winners
          for (const pred of winners) {
            const reward = Math.floor((pred.credits_allocated / totalWinningCredits) * totalPool);

            // Update prediction status and reward
            await adminClient
              .from("predictions")
              .update({ status: "won", reward })
              .eq("id", pred.id);

            // Update winner profile
            const { data: profile } = await adminClient
              .from("profiles")
              .select("futra_credits, resolved_predictions, total_predictions")
              .eq("user_id", pred.user_id)
              .single();

            if (profile) {
              const newResolved = profile.resolved_predictions + 1;
              // Count total wins for this user (current win + previous wins)
              const { count: totalWins } = await adminClient
                .from("predictions")
                .select("*", { count: "exact", head: true })
                .eq("user_id", pred.user_id)
                .eq("status", "won");

              const accuracyRate = profile.total_predictions > 0
                ? Math.round(((totalWins || 0) / Math.max(newResolved, 1)) * 100 * 100) / 100
                : 0;

              await adminClient
                .from("profiles")
                .update({
                  futra_credits: profile.futra_credits + reward,
                  resolved_predictions: newResolved,
                  accuracy_rate: accuracyRate,
                })
                .eq("user_id", pred.user_id);
            }
          }

          // 3b. Mark losers
          for (const pred of losers) {
            await adminClient
              .from("predictions")
              .update({ status: "lost", reward: 0 })
              .eq("id", pred.id);

            const { data: profile } = await adminClient
              .from("profiles")
              .select("resolved_predictions, total_predictions")
              .eq("user_id", pred.user_id)
              .single();

            if (profile) {
              const newResolved = profile.resolved_predictions + 1;
              const { count: totalWins } = await adminClient
                .from("predictions")
                .select("*", { count: "exact", head: true })
                .eq("user_id", pred.user_id)
                .eq("status", "won");

              const accuracyRate = profile.total_predictions > 0
                ? Math.round(((totalWins || 0) / Math.max(newResolved, 1)) * 100 * 100) / 100
                : 0;

              await adminClient
                .from("profiles")
                .update({
                  resolved_predictions: newResolved,
                  accuracy_rate: accuracyRate,
                })
                .eq("user_id", pred.user_id);
            }
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
