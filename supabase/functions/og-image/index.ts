import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

// ── Visual tokens ──────────────────────────────────────────────
const BG = "#060B18";
const BG_CARD = "#0c1425";
const PRIMARY = "#6366f1";
const PRIMARY_DIM = "#6366f140";
const GREEN = "#22c55e";
const RED = "#ef4444";
const WHITE = "#ffffff";
const MUTED = "#71717a";
const BORDER = "#1e293b";
const AMBER = "#f59e0b";
const W = 1200;
const H = 630;

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.substring(0, max - 1) + "…" : str;
}

function influenceLabelPt(level: string): string {
  const map: Record<string, string> = { low: "Iniciante", medium: "Analista", high: "Especialista", elite: "Elite" };
  return map[level] || level;
}

function rarityColor(rarity: string): string {
  const map: Record<string, string> = { common: MUTED, rare: PRIMARY, epic: GREEN, legendary: AMBER };
  return map[rarity] || MUTED;
}

// ── Shared SVG fragments ───────────────────────────────────────
function svgHeader(): string {
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${PRIMARY}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="${BG}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="${BG}"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#glow)"/>`;
}

function svgBrand(): string {
  return `<text x="80" y="72" font-size="26" fill="${PRIMARY}" font-weight="800" font-family="system-ui" letter-spacing="2">FUTRA</text>`;
}

function svgFooter(): string {
  return `<line x1="80" y1="580" x2="1120" y2="580" stroke="${BORDER}" stroke-width="1"/>
    <text x="80" y="608" font-size="16" fill="${MUTED}" font-family="system-ui">futra.app — Torne a incerteza legível</text>`;
}

function svgClose(): string {
  return `</svg>`;
}

// ── Card: Market Odds ──────────────────────────────────────────
function marketCard(market: any): string {
  const options = (market.market_options || [])
    .sort((a: any, b: any) => (b.percentage || 0) - (a.percentage || 0))
    .slice(0, 4);

  const leader = options[0];
  const categoryLabel = esc(market.category || "");

  const categoryBadge = `
    <rect x="1000" y="50" width="${Math.min(categoryLabel.length * 10 + 24, 140)}" height="30" rx="15" fill="${PRIMARY_DIM}"/>
    <text x="${1000 + 12}" y="70" font-size="13" fill="${PRIMARY}" font-family="system-ui" font-weight="600">${categoryLabel.toUpperCase()}</text>`;

  const question = esc(truncate(market.question, 80));
  const questionLines = question.length > 50
    ? [`${question.substring(0, 50)}`, question.substring(50)]
    : [question];

  let questionSvg = "";
  questionLines.forEach((line, i) => {
    questionSvg += `<text x="80" y="${140 + i * 48}" font-size="38" fill="${WHITE}" font-weight="700" font-family="system-ui">${esc(line)}</text>`;
  });

  const leaderY = 140 + questionLines.length * 48 + 20;

  const leaderSvg = leader
    ? `<text x="80" y="${leaderY}" font-size="72" fill="${WHITE}" font-weight="800" font-family="system-ui">${leader.percentage || 0}%</text>
       <text x="${80 + (String(leader.percentage || 0).length + 1) * 42}" y="${leaderY}" font-size="24" fill="${MUTED}" font-family="system-ui" font-weight="500"> ${esc(truncate(leader.label, 30))}</text>`
    : "";

  const barColors = [GREEN, PRIMARY, AMBER, RED];
  const barsStartY = leaderY + 40;
  const optionBars = options.map((o: any, i: number) => {
    const y = barsStartY + i * 52;
    const barWidth = Math.max(30, (o.percentage || 0) * 8);
    return `
      <rect x="80" y="${y}" width="${barWidth}" height="32" rx="6" fill="${barColors[i % barColors.length]}" opacity="0.7"/>
      <text x="100" y="${y + 22}" font-size="15" fill="${WHITE}" font-weight="600" font-family="system-ui">${esc(truncate(o.label, 25))}</text>
      <text x="${Math.max(barWidth + 95, 200)}" y="${y + 22}" font-size="15" fill="${MUTED}" font-family="system-ui">${o.percentage || 0}%</text>`;
  }).join("");

  const metaSvg = `
    <text x="80" y="555" font-size="15" fill="${MUTED}" font-family="system-ui">
      ${market.total_participants || 0} participantes · ${market.total_credits || 0} FC apostados
    </text>`;

  return svgHeader() + svgBrand() + categoryBadge + questionSvg + leaderSvg + optionBars + metaSvg + svgFooter() + svgClose();
}

// ── Card: Win / Result ─────────────────────────────────────────
function winCard(prediction: any, market: any, profile: any, winningLabel: string): string {
  const won = prediction.status === "won";
  const sealColor = won ? GREEN : RED;
  const sealText = won ? "ACERTOU" : "ERROU";
  const sealIcon = won
    ? `<circle cx="1040" cy="120" r="50" fill="none" stroke="${sealColor}" stroke-width="3"/>
       <text x="1040" y="128" text-anchor="middle" font-size="18" fill="${sealColor}" font-weight="800" font-family="system-ui">${sealText}</text>`
    : `<circle cx="1040" cy="120" r="50" fill="none" stroke="${sealColor}" stroke-width="3"/>
       <text x="1040" y="128" text-anchor="middle" font-size="18" fill="${sealColor}" font-weight="800" font-family="system-ui">${sealText}</text>`;

  const question = esc(truncate(market.question, 65));
  const choiceLabel = esc(truncate(prediction.selected_option_label || prediction.selected_option, 30));

  const rewardText = won
    ? `+${prediction.reward || 0} FC`
    : `-${prediction.credits_allocated} FC`;
  const rewardColor = won ? GREEN : RED;

  const scoreDelta = prediction.score_delta;
  const scoreText = scoreDelta != null
    ? `${scoreDelta >= 0 ? "+" : ""}${scoreDelta} score`
    : "";
  const scoreColor = scoreDelta != null && scoreDelta >= 0 ? GREEN : RED;

  return svgHeader() + svgBrand() + `
    ${sealIcon}
    <text x="80" y="160" font-size="16" fill="${MUTED}" font-family="system-ui" font-weight="600" text-transform="uppercase">MERCADO RESOLVIDO</text>
    <text x="80" y="215" font-size="34" fill="${WHITE}" font-weight="700" font-family="system-ui">${question}</text>

    <rect x="80" y="260" width="1040" height="1" fill="${BORDER}"/>

    <text x="80" y="310" font-size="15" fill="${MUTED}" font-family="system-ui">Sua escolha</text>
    <text x="80" y="340" font-size="24" fill="${WHITE}" font-weight="700" font-family="system-ui">${choiceLabel}</text>

    <text x="500" y="310" font-size="15" fill="${MUTED}" font-family="system-ui">Resultado correto</text>
    <text x="500" y="340" font-size="24" fill="${GREEN}" font-weight="700" font-family="system-ui">${esc(truncate(winningLabel, 30))}</text>

    <rect x="80" y="380" width="1040" height="1" fill="${BORDER}"/>

    <text x="80" y="430" font-size="48" fill="${rewardColor}" font-weight="800" font-family="system-ui">${rewardText}</text>
    ${scoreText ? `<text x="380" y="430" font-size="24" fill="${scoreColor}" font-weight="600" font-family="system-ui">${scoreText}</text>` : ""}

    <rect x="80" y="470" width="1040" height="80" rx="12" fill="${BG_CARD}" stroke="${BORDER}" stroke-width="1"/>
    <text x="110" y="500" font-size="16" fill="${MUTED}" font-family="system-ui">${esc(profile?.display_name || "Previsor")}</text>
    <text x="110" y="530" font-size="14" fill="${MUTED}" font-family="system-ui">Precisão: ${Math.round(profile?.accuracy_rate || 0)}% · Score: ${profile?.futra_score || 0}</text>
  ` + svgFooter() + svgClose();
}

// ── Card: Profile ──────────────────────────────────────────────
function profileCard(profile: any, achievementCount: number): string {
  const initial = (profile.display_name || "?").charAt(0).toUpperCase();
  const influenceColor: Record<string, string> = { low: MUTED, medium: PRIMARY, high: GREEN, elite: AMBER };
  const iColor = influenceColor[profile.influence_level] || MUTED;

  return svgHeader() + svgBrand() + `
    <circle cx="160" cy="220" r="60" fill="${BG_CARD}" stroke="${PRIMARY}" stroke-width="2"/>
    <text x="160" y="240" text-anchor="middle" font-size="48" fill="${PRIMARY}" font-weight="700" font-family="system-ui">${initial}</text>

    <text x="250" y="195" font-size="32" fill="${WHITE}" font-weight="700" font-family="system-ui">${esc(truncate(profile.display_name, 25))}</text>
    <text x="250" y="225" font-size="18" fill="${MUTED}" font-family="system-ui">@${esc(profile.username)}</text>

    <rect x="250" y="240" width="${influenceLabelPt(profile.influence_level).length * 10 + 20}" height="28" rx="14" fill="${iColor}20" stroke="${iColor}" stroke-width="1"/>
    <text x="260" y="259" font-size="13" fill="${iColor}" font-weight="600" font-family="system-ui">${influenceLabelPt(profile.influence_level)}</text>

    <rect x="80" y="310" width="1040" height="1" fill="${BORDER}"/>

    <rect x="80" y="340" width="230" height="100" rx="12" fill="${BG_CARD}" stroke="${BORDER}" stroke-width="1"/>
    <text x="195" y="375" text-anchor="middle" font-size="14" fill="${MUTED}" font-family="system-ui">Ranking</text>
    <text x="195" y="415" text-anchor="middle" font-size="36" fill="${WHITE}" font-weight="800" font-family="system-ui">#${profile.global_rank || "—"}</text>

    <rect x="340" y="340" width="230" height="100" rx="12" fill="${BG_CARD}" stroke="${BORDER}" stroke-width="1"/>
    <text x="455" y="375" text-anchor="middle" font-size="14" fill="${MUTED}" font-family="system-ui">Futra Score</text>
    <text x="455" y="415" text-anchor="middle" font-size="36" fill="${PRIMARY}" font-weight="800" font-family="system-ui">${profile.futra_score}</text>

    <rect x="600" y="340" width="230" height="100" rx="12" fill="${BG_CARD}" stroke="${BORDER}" stroke-width="1"/>
    <text x="715" y="375" text-anchor="middle" font-size="14" fill="${MUTED}" font-family="system-ui">Precisão</text>
    <text x="715" y="415" text-anchor="middle" font-size="36" fill="${GREEN}" font-weight="800" font-family="system-ui">${Math.round(profile.accuracy_rate || 0)}%</text>

    <rect x="860" y="340" width="260" height="100" rx="12" fill="${BG_CARD}" stroke="${BORDER}" stroke-width="1"/>
    <text x="940" y="375" text-anchor="middle" font-size="14" fill="${MUTED}" font-family="system-ui">Sequência</text>
    <text x="920" y="415" text-anchor="middle" font-size="36" fill="${AMBER}" font-weight="800" font-family="system-ui">🔥 ${profile.streak}</text>
    <text x="1060" y="415" font-size="14" fill="${MUTED}" font-family="system-ui">${achievementCount} 🏆</text>

    <text x="80" y="510" font-size="16" fill="${MUTED}" font-family="system-ui">${profile.total_predictions} previsões · ${profile.resolved_predictions} resolvidas</text>
  ` + svgFooter() + svgClose();
}

// ── Handler ────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "market";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let svg = "";

    if (type === "market") {
      const marketId = url.searchParams.get("id");
      if (!marketId) return new Response("Missing id", { status: 400, headers });

      const { data: market } = await supabase
        .from("markets")
        .select("question, category, status, total_participants, total_credits, market_options(*)")
        .eq("id", marketId)
        .single();

      if (!market) return new Response("Market not found", { status: 404, headers });
      svg = marketCard(market);

    } else if (type === "win") {
      const predictionId = url.searchParams.get("prediction_id");
      if (!predictionId) return new Response("Missing prediction_id", { status: 400, headers });

      const { data: prediction } = await supabase
        .from("predictions")
        .select("id, market_id, selected_option, status, credits_allocated, reward, score_delta, user_id")
        .eq("id", predictionId)
        .single();

      if (!prediction) return new Response("Prediction not found", { status: 404, headers });

      const { data: market } = await supabase
        .from("markets")
        .select("question, category, resolved_option, market_options(*)")
        .eq("id", prediction.market_id)
        .single();

      if (!market) return new Response("Market not found", { status: 404, headers });

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username, accuracy_rate, futra_score")
        .eq("user_id", prediction.user_id)
        .single();

      // Resolve labels
      const selectedOpt = (market.market_options || []).find((o: any) => o.id === prediction.selected_option);
      const winningOpt = (market.market_options || []).find((o: any) => o.id === market.resolved_option);

      prediction.selected_option_label = selectedOpt?.label || prediction.selected_option;
      const winningLabel = winningOpt?.label || market.resolved_option || "—";

      svg = winCard(prediction, market, profile, winningLabel);

    } else if (type === "profile") {
      const username = url.searchParams.get("username");
      if (!username) return new Response("Missing username", { status: 400, headers });

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (!profile) return new Response("Profile not found", { status: 404, headers });

      const { count } = await supabase
        .from("user_achievements")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.user_id);

      svg = profileCard(profile, count || 0);

    } else {
      return new Response("Invalid type. Use: market, win, profile", { status: 400, headers });
    }

    return new Response(svg, {
      headers: {
        ...headers,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return new Response((err as Error).message, { status: 500, headers });
  }
});
