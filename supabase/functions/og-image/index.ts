import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const marketId = url.searchParams.get("id");
    if (!marketId) {
      return new Response("Missing id param", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: market } = await supabase
      .from("markets")
      .select("question, category, status, market_options(*)")
      .eq("id", marketId)
      .single();

    if (!market) {
      return new Response("Market not found", { status: 404, headers: corsHeaders });
    }

    const options = (market.market_options || [])
      .sort((a: any, b: any) => (b.percentage || 0) - (a.percentage || 0))
      .slice(0, 4);

    // Generate SVG-based OG image
    const barColors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];
    const optionBars = options.map((o: any, i: number) => {
      const y = 320 + i * 70;
      const barWidth = Math.max(20, (o.percentage || 0) * 7);
      return `
        <rect x="80" y="${y}" width="${barWidth}" height="40" rx="8" fill="${barColors[i % barColors.length]}" opacity="0.8"/>
        <text x="100" y="${y + 27}" font-size="20" fill="white" font-weight="600">${o.label}: ${o.percentage || 0}%</text>
      `;
    }).join("");

    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="630" fill="#09090b"/>
        <text x="80" y="80" font-size="28" fill="#6366f1" font-weight="bold" font-family="system-ui">FUTRA</text>
        <rect x="160" y="60" width="100" height="28" rx="14" fill="#6366f120"/>
        <text x="175" y="80" font-size="14" fill="#a78bfa" font-family="system-ui">${market.category}</text>
        <text x="80" y="180" font-size="42" fill="white" font-weight="bold" font-family="system-ui">
          ${escapeXml(market.question.length > 60 ? market.question.substring(0, 57) + "..." : market.question)}
        </text>
        ${optionBars}
        <text x="80" y="600" font-size="18" fill="#71717a" font-family="system-ui">Vote on FUTRA — futra.app</text>
      </svg>
    `;

    // Return SVG as PNG fallback (social crawlers accept SVG in many cases)
    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return new Response((err as Error).message, { status: 500, headers: corsHeaders });
  }
});

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
