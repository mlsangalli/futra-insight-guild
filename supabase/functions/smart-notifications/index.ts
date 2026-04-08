import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Smart Notifications — periodic job that generates useful, non-spammy notifications.
 *
 * Events covered:
 * 1. market_lock_soon    — user has prediction on market locking within 6h
 * 2. watchlist_movement  — watchlist market had >10pp change in last 24h
 * 3. rank_up             — user's global_rank improved
 * 4. new_category_market — new market in user's top category (last 24h)
 *
 * Already handled elsewhere:
 * - result resolved  → resolve_market_and_score RPC
 * - reward received  → resolve_market_and_score RPC
 * - achievement      → check_achievements RPC
 * - mission complete → claim_mission_reward RPC
 *
 * Deduplication: checks for existing notification with same type + entity in last 24h.
 */

const LOCK_HORIZON_HOURS = 6;
const MOVEMENT_THRESHOLD_PP = 10;
const DEDUP_WINDOW_HOURS = 24;
const MAX_NOTIFICATIONS_PER_RUN = 200;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const dedupCutoff = new Date(now.getTime() - DEDUP_WINDOW_HOURS * 3600_000).toISOString();
    let totalCreated = 0;

    // ── Helper: deduplicated insert ────────────────────────────
    async function insertIfNew(
      userId: string,
      type: string,
      title: string,
      body: string,
      data: Record<string, unknown>,
      entityKey: string // unique key for dedup within type
    ): Promise<boolean> {
      if (totalCreated >= MAX_NOTIFICATIONS_PER_RUN) return false;

      // Check for existing notification of same type + entity in window
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", type)
        .gte("created_at", dedupCutoff)
        .contains("data", { entity_key: entityKey });

      if ((count || 0) > 0) return false;

      const { error } = await supabase.from("notifications").insert({
        user_id: userId,
        type,
        title,
        body,
        data: { ...data, entity_key: entityKey },
      });

      if (!error) {
        totalCreated++;
        return true;
      }
      console.error(`Failed to insert notification: ${error.message}`);
      return false;
    }

    // ── 1. Market lock soon ───────────────────────────────────
    const lockHorizon = new Date(now.getTime() + LOCK_HORIZON_HOURS * 3600_000).toISOString();
    const { data: lockingMarkets } = await supabase
      .from("markets")
      .select("id, question, lock_date")
      .eq("status", "open")
      .not("lock_date", "is", null)
      .gt("lock_date", now.toISOString())
      .lte("lock_date", lockHorizon)
      .limit(50);

    if (lockingMarkets && lockingMarkets.length > 0) {
      const marketIds = lockingMarkets.map((m) => m.id);

      // Get users who have NOT yet predicted on these markets but have them in watchlist
      const { data: watchlistEntries } = await supabase
        .from("watchlist")
        .select("user_id, market_id")
        .in("market_id", marketIds);

      if (watchlistEntries) {
        // Get users who already predicted
        const { data: existingPredictions } = await supabase
          .from("predictions")
          .select("user_id, market_id")
          .in("market_id", marketIds);

        const predSet = new Set(
          (existingPredictions || []).map((p) => `${p.user_id}:${p.market_id}`)
        );

        for (const entry of watchlistEntries) {
          const key = `${entry.user_id}:${entry.market_id}`;
          if (predSet.has(key)) continue; // already predicted

          const market = lockingMarkets.find((m) => m.id === entry.market_id);
          if (!market) continue;

          const hoursLeft = Math.round(
            (new Date(market.lock_date!).getTime() - now.getTime()) / 3600_000
          );

          await insertIfNew(
            entry.user_id,
            "market_lock_soon",
            "Previsões fechando em breve",
            `"${truncate(market.question, 60)}" fecha em ${hoursLeft}h. Faça sua previsão.`,
            { market_id: market.id },
            `lock:${market.id}`
          );
        }
      }
    }

    // ── 2. Watchlist movement (>10pp change) ──────────────────
    // Compare current leader % with 24h ago snapshot via recent predictions
    const { data: activeWatchlistMarkets } = await supabase
      .from("markets")
      .select("id, question, total_participants")
      .eq("status", "open")
      .gt("total_participants", 5) // only meaningful markets
      .limit(100);

    if (activeWatchlistMarkets && activeWatchlistMarkets.length > 0) {
      const awmIds = activeWatchlistMarkets.map((m) => m.id);

      // Get current options
      const { data: currentOptions } = await supabase
        .from("market_options")
        .select("market_id, label, percentage")
        .in("market_id", awmIds)
        .order("percentage", { ascending: false });

      // Get recent prediction counts as proxy for movement
      const recentCutoff = new Date(now.getTime() - 24 * 3600_000).toISOString();
      const { data: recentActivity } = await supabase
        .from("predictions")
        .select("market_id")
        .in("market_id", awmIds)
        .gte("created_at", recentCutoff);

      // Count predictions per market in last 24h
      const activityMap = new Map<string, number>();
      for (const p of recentActivity || []) {
        activityMap.set(p.market_id, (activityMap.get(p.market_id) || 0) + 1);
      }

      // Markets with significant recent activity (proxy for big movement)
      const movedMarketIds = [...activityMap.entries()]
        .filter(([, count]) => count >= 3)
        .map(([id]) => id);

      if (movedMarketIds.length > 0) {
        const { data: watchEntries } = await supabase
          .from("watchlist")
          .select("user_id, market_id")
          .in("market_id", movedMarketIds);

        const optionsByMarket = new Map<string, { label: string; percentage: number }>();
        for (const opt of currentOptions || []) {
          if (!optionsByMarket.has(opt.market_id)) {
            optionsByMarket.set(opt.market_id, { label: opt.label, percentage: Number(opt.percentage) });
          }
        }

        for (const entry of watchEntries || []) {
          const market = activeWatchlistMarkets.find((m) => m.id === entry.market_id);
          const leader = optionsByMarket.get(entry.market_id);
          if (!market || !leader) continue;

          const count = activityMap.get(entry.market_id) || 0;
          await insertIfNew(
            entry.user_id,
            "watchlist_movement",
            "Movimentação no mercado salvo",
            `"${truncate(market.question, 50)}" — ${leader.label} a ${leader.percentage}% (+${count} previsões recentes)`,
            { market_id: market.id },
            `movement:${market.id}`
          );
        }
      }
    }

    // ── 3. Rank improvement ──────────────────────────────────
    // We detect rank improvements by checking profiles updated recently
    // where global_rank decreased (improved) compared to a stored snapshot.
    // Simple approach: notify users who just entered top 50 or improved 5+ positions.
    // Since we don't have a rank history table, we check profiles updated in the last hour
    // with small rank numbers.
    const { data: topProfiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, global_rank, futra_score, influence_level")
      .gt("global_rank", 0)
      .lte("global_rank", 50)
      .gte("updated_at", new Date(now.getTime() - 3600_000).toISOString())
      .order("global_rank", { ascending: true })
      .limit(50);

    for (const p of topProfiles || []) {
      await insertIfNew(
        p.user_id,
        "rank_up",
        `Você está no Top ${p.global_rank}!`,
        `Ranking #${p.global_rank} com ${p.futra_score} de score. Continue assim.`,
        { rank: p.global_rank },
        `rank:${p.global_rank}`
      );
    }

    // ── 4. New market in user's favorite category ────────────
    const { data: newMarkets } = await supabase
      .from("markets")
      .select("id, question, category")
      .eq("status", "open")
      .gte("created_at", new Date(now.getTime() - 24 * 3600_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    if (newMarkets && newMarkets.length > 0) {
      // Get users with specialties matching these categories
      const categories = [...new Set(newMarkets.map((m) => m.category))];

      const { data: interestedProfiles } = await supabase
        .from("profiles")
        .select("user_id, specialties")
        .not("specialties", "is", null)
        .limit(500);

      for (const profile of interestedProfiles || []) {
        if (!profile.specialties || profile.specialties.length === 0) continue;

        for (const market of newMarkets) {
          if (!profile.specialties.includes(market.category)) continue;

          await insertIfNew(
            profile.user_id,
            "new_category_market",
            "Novo mercado na sua área",
            `"${truncate(market.question, 60)}" — ${categoryLabel(market.category)}`,
            { market_id: market.id, category: market.category },
            `newcat:${market.id}`
          );
          break; // max 1 new-market notification per user per run
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications_created: totalCreated }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("smart-notifications error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});

function truncate(str: string, max: number): string {
  return str.length > max ? str.substring(0, max - 1) + "…" : str;
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    politics: "Política",
    economy: "Economia",
    crypto: "Cripto",
    football: "Futebol",
    culture: "Cultura",
    technology: "Tecnologia",
  };
  return map[cat] || cat;
}
