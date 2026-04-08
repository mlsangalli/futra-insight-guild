import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { captureException } from "../_shared/sentry.ts";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";
const MAX_RESOLVE_PER_RUN = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Parse optional body for single-market retry mode
  let singleMarketId: string | null = null;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      singleMarketId = body?.market_id || null;
    } catch { /* no body = cron mode */ }
  }

  // Rate limit only for cron mode (single-market retry is admin-initiated)
  if (!singleMarketId) {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(clientIp, 1, 60_000);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const results = { closed: 0, resolved: 0, skipped: 0, errors: 0, closedIds: [] as string[], resolvedIds: [] as string[] };

    // ─── PHASE 1: Close open markets whose lock_date has passed (skip in single-market retry mode) ───
    if (!singleMarketId) {
      const { data: marketsToClose, error: closeErr } = await adminClient
        .from("markets")
        .select("id, question")
        .eq("status", "open")
        .not("lock_date", "is", null)
        .lte("lock_date", new Date().toISOString());

      if (closeErr) throw closeErr;

      if (marketsToClose && marketsToClose.length > 0) {
        const ids = marketsToClose.map((m: any) => m.id);
        const { error: updateErr } = await adminClient
          .from("markets")
          .update({ status: "closed" })
          .in("id", ids);
        if (updateErr) throw updateErr;

        const logRows = marketsToClose.map((m: any) => ({
          admin_user_id: SYSTEM_USER_ID,
          action_type: "auto_close_locked",
          entity_type: "market",
          entity_id: m.id,
          description: `Auto-closed locked market: ${m.question}`,
        }));
        await adminClient.from("admin_logs").insert(logRows);

        results.closed = marketsToClose.length;
        results.closedIds = ids;
      }
    }

    // ─── PHASE 2: Resolve closed markets whose end_date has passed ───
    if (!lovableApiKey) {
      console.warn("LOVABLE_API_KEY not set, skipping auto-resolution phase");
      return new Response(JSON.stringify({ ...results, resolveSkipReason: "no_api_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let resolveQuery = adminClient
      .from("markets")
      .select("id, question, category, resolution_source, resolution_rules")
      .eq("status", "closed");

    if (singleMarketId) {
      resolveQuery = resolveQuery.eq("id", singleMarketId);
    } else {
      resolveQuery = resolveQuery.lte("end_date", new Date().toISOString());
    }
    resolveQuery = resolveQuery.limit(singleMarketId ? 1 : MAX_RESOLVE_PER_RUN);

    const { data: marketsToResolve, error: resolveErr } = await resolveQuery;
    if (resolveErr) throw resolveErr;

    if (marketsToResolve && marketsToResolve.length > 0) {
      for (const market of marketsToResolve) {
        try {
          // Fetch market options
          const { data: options, error: optErr } = await adminClient
            .from("market_options")
            .select("id, label, total_votes, total_credits, percentage")
            .eq("market_id", market.id)
            .order("created_at");

          if (optErr || !options || options.length === 0) {
            console.error(`No options for market ${market.id}:`, optErr);
            results.errors++;
            continue;
          }

          // Call Lovable AI with tool calling for structured output
          const optionsText = options.map((o: any, i: number) => `${i + 1}. "${o.label}" (id: ${o.id})`).join("\n");

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: `You are a prediction market resolver. Given a market question, its options, and resolution criteria, determine which option is the correct outcome based on verifiable facts as of today (${new Date().toISOString().split("T")[0]}).

IMPORTANT RULES:
- Only resolve if you are HIGHLY confident the outcome is already determined and publicly known.
- If the event hasn't happened yet, or results are unclear/disputed, return null for winning_option_id.
- Use the exact option ID from the provided list.
- Provide clear reasoning citing facts.`,
                },
                {
                  role: "user",
                  content: `Market Question: ${market.question}
Category: ${market.category}
Resolution Source: ${market.resolution_source || "Not specified"}
Resolution Rules: ${market.resolution_rules || "Standard resolution"}

Options:
${optionsText}

Determine the winning option. Today's date is ${new Date().toISOString().split("T")[0]}.`,
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "resolve_market",
                    description: "Submit the resolution decision for a prediction market.",
                    parameters: {
                      type: "object",
                      properties: {
                        winning_option_id: {
                          type: ["string", "null"],
                          description: "The UUID of the winning option, or null if the outcome cannot be determined with high confidence.",
                        },
                        confidence: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                          description: "How confident you are in this resolution.",
                        },
                        reasoning: {
                          type: "string",
                          description: "Brief explanation of why this option won, citing verifiable facts.",
                        },
                      },
                      required: ["winning_option_id", "confidence", "reasoning"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "resolve_market" } },
            }),
          });

          if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error(`AI error for market ${market.id}: ${aiResponse.status} ${errText}`);
            results.errors++;
            await adminClient.from("admin_logs").insert({
              admin_user_id: SYSTEM_USER_ID,
              action_type: "auto_resolve_error",
              entity_type: "market",
              entity_id: market.id,
              description: `AI gateway error ${aiResponse.status}: ${errText.substring(0, 200)}`,
            });
            continue;
          }

          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

          if (!toolCall) {
            console.error(`No tool call in AI response for market ${market.id}`);
            results.skipped++;
            await adminClient.from("admin_logs").insert({
              admin_user_id: SYSTEM_USER_ID,
              action_type: "auto_resolve_skipped",
              entity_type: "market",
              entity_id: market.id,
              description: `AI did not return a tool call for: ${market.question}`,
            });
            continue;
          }

          let decision: { winning_option_id: string | null; confidence: string; reasoning: string };
          try {
            decision = JSON.parse(toolCall.function.arguments);
          } catch {
            console.error(`Failed to parse AI response for market ${market.id}`);
            results.errors++;
            continue;
          }

          // Only resolve with high confidence (or medium when admin-triggered retry)
          const acceptableConfidence = singleMarketId ? ["high", "medium"] : ["high"];
          if (!decision.winning_option_id || !acceptableConfidence.includes(decision.confidence)) {
            results.skipped++;
            await adminClient.from("admin_logs").insert({
              admin_user_id: SYSTEM_USER_ID,
              action_type: "auto_resolve_skipped",
              entity_type: "market",
              entity_id: market.id,
              description: `Skipped (confidence: ${decision.confidence}): ${decision.reasoning}`,
            });
            continue;
          }

          // Validate the winning option belongs to this market
          const validOption = options.find((o: any) => o.id === decision.winning_option_id);
          if (!validOption) {
            console.error(`AI returned invalid option ID ${decision.winning_option_id} for market ${market.id}`);
            results.errors++;
            await adminClient.from("admin_logs").insert({
              admin_user_id: SYSTEM_USER_ID,
              action_type: "auto_resolve_error",
              entity_type: "market",
              entity_id: market.id,
              description: `Invalid option ID from AI: ${decision.winning_option_id}`,
            });
            continue;
          }

          // Call the existing atomic RPC to resolve and distribute rewards
          const { data: rpcResult, error: rpcErr } = await adminClient.rpc("resolve_market_and_score", {
            p_market_id: market.id,
            p_winning_option: decision.winning_option_id,
          });

          if (rpcErr) {
            console.error(`RPC error for market ${market.id}:`, rpcErr);
            results.errors++;
            await adminClient.from("admin_logs").insert({
              admin_user_id: SYSTEM_USER_ID,
              action_type: "auto_resolve_error",
              entity_type: "market",
              entity_id: market.id,
              description: `RPC error: ${rpcErr.message}`,
            });
            continue;
          }

          results.resolved++;
          results.resolvedIds.push(market.id);
          await adminClient.from("admin_logs").insert({
            admin_user_id: SYSTEM_USER_ID,
            action_type: "auto_resolve_ai",
            entity_type: "market",
            entity_id: market.id,
            description: `Auto-resolved via AI: "${market.question}" → "${validOption.label}". Reasoning: ${decision.reasoning}`,
          });

          console.log(`Resolved market ${market.id}: ${validOption.label}`);
        } catch (marketErr) {
          console.error(`Error processing market ${market.id}:`, marketErr);
          results.errors++;
        }
      }
    }

    // Track analytics events
    if (results.closed > 0) {
      await adminClient.from("analytics_events").insert({
        event_name: "market_auto_closed",
        properties: { count: results.closed, ids: results.closedIds },
      });
    }
    if (results.resolved > 0) {
      await adminClient.from("analytics_events").insert({
        event_name: "market_auto_resolved",
        properties: { count: results.resolved, ids: results.resolvedIds },
      });
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fatal error:", error);
    await captureException(error as Error, { functionName: "close-and-resolve-markets" });
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
