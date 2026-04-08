import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Lightweight antifraud checker — runs periodically (every 30min via cron).
 * Checks for anomalous patterns and logs suspicious events.
 * 
 * Signals detected:
 * 1. Rapid-fire predictions (>10 in 5 min from same user)
 * 2. Concentrated betting (>80% credits on single market)
 * 3. Suspicious signup patterns (many signups from same time window)
 * 4. Comment spam (>10 comments in 10 min)
 */

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jobStart = Date.now();
  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60_000).toISOString();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60_000).toISOString();
    const tenMinAgo = new Date(now.getTime() - 10 * 60_000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60_000).toISOString();

    const flags: Array<{
      user_id: string | null;
      event_type: string;
      severity: string;
      description: string;
      metadata: Record<string, unknown>;
    }> = [];

    // 1. Rapid-fire predictions: >10 predictions in 5 minutes from same user
    const { data: recentPredictions } = await admin
      .from("predictions")
      .select("user_id, created_at")
      .gte("created_at", fiveMinAgo)
      .order("created_at", { ascending: false });

    if (recentPredictions) {
      const userCounts = new Map<string, number>();
      for (const p of recentPredictions) {
        userCounts.set(p.user_id, (userCounts.get(p.user_id) || 0) + 1);
      }
      for (const [userId, count] of userCounts) {
        if (count > 10) {
          flags.push({
            user_id: userId,
            event_type: "rapid_predictions",
            severity: "high",
            description: `${count} previsões em 5 minutos`,
            metadata: { count, window_minutes: 5 },
          });
        }
      }
    }

    // 2. Concentrated betting: user puts >80% of credits on single market in last hour
    const { data: recentHeavyBets } = await admin
      .from("predictions")
      .select("user_id, market_id, credits_allocated")
      .gte("created_at", oneHourAgo);

    if (recentHeavyBets) {
      const userBets = new Map<string, { total: number; byMarket: Map<string, number> }>();
      for (const p of recentHeavyBets) {
        let entry = userBets.get(p.user_id);
        if (!entry) {
          entry = { total: 0, byMarket: new Map() };
          userBets.set(p.user_id, entry);
        }
        entry.total += p.credits_allocated;
        entry.byMarket.set(p.market_id, (entry.byMarket.get(p.market_id) || 0) + p.credits_allocated);
      }
      for (const [userId, entry] of userBets) {
        if (entry.total < 500) continue; // only flag significant amounts
        for (const [marketId, credits] of entry.byMarket) {
          const ratio = credits / entry.total;
          if (ratio > 0.8 && credits >= 500) {
            flags.push({
              user_id: userId,
              event_type: "concentrated_betting",
              severity: "medium",
              description: `${Math.round(ratio * 100)}% dos créditos (${credits} FC) em um único mercado`,
              metadata: { market_id: marketId, credits, ratio: Math.round(ratio * 100) },
            });
          }
        }
      }
    }

    // 3. Comment spam: >10 comments in 10 min from same user
    const { data: recentComments } = await admin
      .from("comments")
      .select("user_id, created_at")
      .gte("created_at", tenMinAgo);

    if (recentComments) {
      const commentCounts = new Map<string, number>();
      for (const c of recentComments) {
        commentCounts.set(c.user_id, (commentCounts.get(c.user_id) || 0) + 1);
      }
      for (const [userId, count] of commentCounts) {
        if (count > 10) {
          flags.push({
            user_id: userId,
            event_type: "comment_spam",
            severity: "medium",
            description: `${count} comentários em 10 minutos`,
            metadata: { count, window_minutes: 10 },
          });
        }
      }
    }

    // 4. Suspicious signup burst: >5 signups in 30 min
    const { data: recentSignups } = await admin
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", thirtyMinAgo);

    if (recentSignups && recentSignups.length > 5) {
      flags.push({
        user_id: null,
        event_type: "signup_burst",
        severity: "low",
        description: `${recentSignups.length} cadastros em 30 minutos`,
        metadata: { count: recentSignups.length, window_minutes: 30 },
      });
    }

    // Deduplicate: don't re-flag the same user+event_type within 1 hour
    const filteredFlags: typeof flags = [];
    for (const flag of flags) {
      const { data: existing } = await admin
        .from("suspicious_events")
        .select("id")
        .eq("event_type", flag.event_type)
        .gte("created_at", oneHourAgo)
        .limit(1);

      // For user-specific events, also check user_id
      if (flag.user_id && existing) {
        const { data: userExisting } = await admin
          .from("suspicious_events")
          .select("id")
          .eq("event_type", flag.event_type)
          .eq("user_id", flag.user_id)
          .gte("created_at", oneHourAgo)
          .limit(1);
        if (userExisting && userExisting.length > 0) continue;
      } else if (!flag.user_id && existing && existing.length > 0) {
        continue;
      }
      filteredFlags.push(flag);
    }

    // Insert new flags
    if (filteredFlags.length > 0) {
      await admin.from("suspicious_events").insert(filteredFlags);
      
      // Also log in admin_logs for visibility
      await admin.from("admin_logs").insert({
        admin_user_id: SYSTEM_USER_ID,
        action_type: "antifraud_flags",
        entity_type: "system",
        description: `${filteredFlags.length} evento(s) suspeito(s) detectado(s): ${filteredFlags.map(f => f.event_type).join(", ")}`,
      });
    }

    // Log job execution
    const durationMs = Date.now() - jobStart;
    await admin.from("job_executions").insert({
      job_name: "antifraud-check",
      status: filteredFlags.length > 0 ? "success" : "skipped",
      duration_ms: durationMs,
      metrics: {
        flags_total: flags.length,
        flags_new: filteredFlags.length,
        flags_deduplicated: flags.length - filteredFlags.length,
      },
    });

    return new Response(
      JSON.stringify({
        checked_at: now.toISOString(),
        flags_detected: filteredFlags.length,
        flags_deduplicated: flags.length - filteredFlags.length,
        flags: filteredFlags,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Antifraud check error:", error);

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const client = createClient(supabaseUrl, serviceRoleKey);
      await client.from("job_executions").insert({
        job_name: "antifraud-check",
        status: "failed",
        duration_ms: Date.now() - jobStart,
        error_message: (error as Error).message,
      });
    } catch { /* best effort */ }

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers }
    );
  }
});
