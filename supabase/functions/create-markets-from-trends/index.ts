import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";
const MAX_MARKETS_PER_RUN = 3;

// Category keyword mapping (PT-BR)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  football: [
    "futebol", "gol", "campeonato", "copa", "seleção", "flamengo", "corinthians",
    "palmeiras", "são paulo", "vasco", "botafogo", "grêmio", "cruzeiro", "santos",
    "fluminense", "atlético", "libertadores", "brasileirão", "premier league",
    "champions", "neymar", "messi", "mbappé", "premier", "serie a", "la liga",
  ],
  politics: [
    "eleição", "eleições", "presidente", "governo", "congresso", "senado",
    "câmara", "deputado", "ministro", "política", "lula", "bolsonaro",
    "stf", "supremo", "impeachment", "votação", "reforma", "prefeito",
  ],
  crypto: [
    "bitcoin", "btc", "ethereum", "eth", "crypto", "criptomoeda", "blockchain",
    "altcoin", "binance", "solana", "dogecoin", "nft", "defi", "token", "halving",
  ],
  economy: [
    "pib", "inflação", "selic", "dólar", "bolsa", "ibovespa", "juros",
    "economia", "recessão", "emprego", "desemprego", "ipca", "banco central",
    "câmbio", "mercado financeiro", "wall street", "nasdaq", "s&p",
  ],
  culture: [
    "filme", "cinema", "oscar", "grammy", "música", "série", "netflix",
    "streaming", "novela", "reality", "bbb", "show", "artista", "festival",
    "livro", "tv", "celebridade", "anitta", "taylor swift",
  ],
  technology: [
    "inteligência artificial", "ia", "ai", "openai", "chatgpt", "google",
    "apple", "iphone", "meta", "tesla", "spacex", "elon musk", "microsoft",
    "samsung", "startup", "tecnologia", "app", "software",
  ],
};

function classifyCategory(topic: string): string | null {
  const lower = topic.toLowerCase();
  let bestCategory: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore > 0 ? bestCategory : null;
}

async function hashTopic(topic: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(topic.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface TrendTopic {
  topic: string;
  source: "google_trends" | "rss";
  category: string;
  hash: string;
}

// RSS feeds from major Brazilian news portals
const RSS_FEEDS = [
  "https://g1.globo.com/rss/g1/",
  "https://g1.globo.com/rss/g1/economia/",
  "https://g1.globo.com/rss/g1/politica/",
  "https://g1.globo.com/rss/g1/tecnologia/",
  "https://g1.globo.com/rss/g1/pop-arte/",
  "https://rss.uol.com.br/feed/noticias.xml",
  "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml",
];

function extractTextFromXml(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([^\\]]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*?)<\\/${tag}>`, "gi");
  const results: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const text = (match[1] || match[2] || "").trim();
    if (text) results.push(text);
  }
  return results;
}

async function fetchRssHeadlines(): Promise<TrendTopic[]> {
  const trends: TrendTopic[] = [];
  const seen = new Set<string>();

  for (const feedUrl of RSS_FEEDS) {
    try {
      const res = await fetch(feedUrl, {
        headers: { "User-Agent": "FUTRA-Bot/1.0" },
      });
      if (!res.ok) {
        console.error(`RSS fetch error ${feedUrl}:`, res.status);
        continue;
      }
      const xml = await res.text();
      const titles = extractTextFromXml(xml, "title");

      // Skip first title (usually the feed name)
      for (const title of titles.slice(1, 8)) {
        if (!title || title.length < 10) continue;

        const normalized = title.toLowerCase().trim();
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        const category = classifyCategory(title);
        if (!category) continue;

        const hash = await hashTopic(`rss:${title}`);
        trends.push({ topic: title, source: "rss", category, hash });
      }
    } catch (e) {
      console.error(`RSS error ${feedUrl}:`, e);
    }
  }

  return trends;
}

async function fetchGoogleTrends(apiKey: string): Promise<TrendTopic[]> {
  try {
    const url = `https://serpapi.com/search.json?engine=google_trends_trending_now&geo=BR&api_key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("SerpApi error:", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    const trends: TrendTopic[] = [];

    const trendingSearches = data.trending_searches || data.daily_searches || [];
    for (const item of trendingSearches.slice(0, 10)) {
      const topic = item.query || item.title?.query || item.title || "";
      if (!topic || topic.length < 3) continue;

      const category = classifyCategory(topic);
      if (!category) continue;

      const hash = await hashTopic(`google_trends:${topic}`);
      trends.push({ topic, source: "google_trends", category, hash });
    }

    return trends;
  } catch (e) {
    console.error("Google Trends fetch error:", e);
    return [];
  }
}


async function generateMarketFromAI(
  topic: string,
  category: string,
  apiKey: string
): Promise<{
  question: string;
  options: string[];
  end_date_days: number;
  resolution_source: string;
  description: string;
} | null> {
  try {
    const res = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Você é o gerador de mercados da FUTRA, uma plataforma de previsões brasileira.
Dado um tópico em tendência no Brasil, crie uma pergunta de mercado preditivo em Português (BR).

Regras:
- A pergunta DEVE ter um resultado verificável e definitivo
- 2 a 4 opções (sempre incluir desfechos opostos)
- end_date_days: de 3 a 14 dias, baseado na urgência do tópico
- resolution_source: fonte verificável (ex: "Placar final do jogo", "Resultado oficial da eleição")
- description: breve contexto sobre o tópico (1-2 frases)
- Linguagem analítica, não sensacionalista
- Não use pontuação dupla na pergunta

Responda SOMENTE com JSON válido (sem markdown): { "question": string, "options": string[], "end_date_days": number, "resolution_source": string, "description": string }`,
            },
            {
              role: "user",
              content: `Tópico: "${topic}"\nCategoria: "${category}"`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_market",
                description:
                  "Create a prediction market from a trending topic",
                parameters: {
                  type: "object",
                  properties: {
                    question: { type: "string", description: "Market question in PT-BR" },
                    options: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 2,
                      maxItems: 4,
                      description: "2-4 answer options",
                    },
                    end_date_days: {
                      type: "number",
                      description: "Days from now until market closes (3-14)",
                    },
                    resolution_source: {
                      type: "string",
                      description: "Verification source for the outcome",
                    },
                    description: {
                      type: "string",
                      description: "Brief context about the topic",
                    },
                  },
                  required: [
                    "question",
                    "options",
                    "end_date_days",
                    "resolution_source",
                    "description",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "create_market" },
          },
        }),
      }
    );

    if (!res.ok) {
      console.error("AI Gateway error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response");
      return null;
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    if (
      !parsed.question ||
      !Array.isArray(parsed.options) ||
      parsed.options.length < 2
    ) {
      console.error("Invalid AI output:", parsed);
      return null;
    }

    return {
      question: parsed.question,
      options: parsed.options,
      end_date_days: Math.min(14, Math.max(3, parsed.end_date_days || 7)),
      resolution_source: parsed.resolution_source || "",
      description: parsed.description || "",
    };
  } catch (e) {
    console.error("AI generation error:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(clientIp, 1, 600_000); // 1 per 10 min
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
      { status: 429, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serpApiKey = Deno.env.get("SERPAPI_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch trends from available sources in parallel
    // RSS is always available (no API key needed)
    const trendPromises: Promise<TrendTopic[]>[] = [fetchRssHeadlines()];
    if (serpApiKey) trendPromises.push(fetchGoogleTrends(serpApiKey));

    const trendResults = await Promise.all(trendPromises);
    const allTrends = trendResults.flat();

    if (allTrends.length === 0) {
      return new Response(
        JSON.stringify({ created: 0, message: "No suitable trends found" }),
        { headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Check existing hashes to deduplicate
    const hashes = allTrends.map((t) => t.hash);
    const { data: existingHashes } = await adminClient
      .from("scheduled_markets")
      .select("topic_hash")
      .in("topic_hash", hashes);

    const existingSet = new Set(
      (existingHashes || []).map((e: any) => e.topic_hash)
    );
    const newTrends = allTrends.filter((t) => !existingSet.has(t.hash));

    if (newTrends.length === 0) {
      return new Response(
        JSON.stringify({ created: 0, message: "All trends already processed" }),
        { headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Process up to MAX_MARKETS_PER_RUN new trends
    const toProcess = newTrends.slice(0, MAX_MARKETS_PER_RUN);
    const createdMarkets: { market_id: string; question: string; topic: string }[] = [];

    for (const trend of toProcess) {
      const aiResult = await generateMarketFromAI(
        trend.topic,
        trend.category,
        lovableApiKey
      );

      if (!aiResult) {
        // Record as skipped
        await adminClient.from("scheduled_markets").insert({
          source: trend.source,
          source_topic: trend.topic,
          topic_hash: trend.hash,
          category: trend.category,
          status: "skipped",
        }).single();
        continue;
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + aiResult.end_date_days);

      const optionsJson = aiResult.options.map((label) => ({ label }));

      const { data: market, error: insertErr } = await adminClient
        .from("markets")
        .insert({
          question: aiResult.question,
          description: aiResult.description,
          category: trend.category,
          type: aiResult.options.length === 2 ? "binary" : "multiple",
          options: optionsJson,
          end_date: endDate.toISOString(),
          status: "open",
          resolution_source: aiResult.resolution_source,
          resolution_rules: `Fonte: ${aiResult.resolution_source}`,
          created_by: SYSTEM_USER_ID,
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Market insert error:", insertErr);
        await adminClient.from("scheduled_markets").insert({
          source: trend.source,
          source_topic: trend.topic,
          topic_hash: trend.hash,
          category: trend.category,
          status: "failed",
        }).single();
        continue;
      }

      // Record in scheduled_markets
      await adminClient.from("scheduled_markets").insert({
        source: trend.source,
        source_topic: trend.topic,
        topic_hash: trend.hash,
        market_id: market.id,
        category: trend.category,
        status: "created",
      }).single();

      // Admin log
      await adminClient.from("admin_logs").insert({
        admin_user_id: SYSTEM_USER_ID,
        action_type: "auto_create_market",
        entity_type: "market",
        entity_id: market.id,
        description: `Auto-created from ${trend.source}: "${trend.topic}" → "${aiResult.question}"`,
      });

      createdMarkets.push({
        market_id: market.id,
        question: aiResult.question,
        topic: trend.topic,
      });
    }

    return new Response(
      JSON.stringify({
        created: createdMarkets.length,
        markets: createdMarkets,
        trends_found: allTrends.length,
        new_trends: newTrends.length,
      }),
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-markets-from-trends error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
