import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const MAX_CANDIDATES_PER_RUN = 5;
const AUTO_PUBLISH_THRESHOLD = 0.85; // quality_score >= this → auto-publish
const MIN_QUALITY_THRESHOLD = 0.45; // below this → skip entirely

// ─── Category keyword mapping (PT-BR) ───────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, { primary: string[]; secondary: string[] }> = {
  football: {
    primary: [
      "futebol", "campeonato", "copa", "seleção", "libertadores", "brasileirão",
      "premier league", "champions league", "serie a", "la liga", "copa do mundo",
      "copa américa", "sul-americana", "copa do brasil", "supercopa",
    ],
    secondary: [
      "gol", "flamengo", "corinthians", "palmeiras", "são paulo", "vasco",
      "botafogo", "grêmio", "cruzeiro", "santos", "fluminense", "atlético",
      "neymar", "messi", "mbappé", "endrick", "vini jr", "real madrid",
      "barcelona", "manchester", "liverpool", "bayern", "psg", "artilheiro",
      "rebaixamento", "classificação", "rodada", "técnico", "demissão treinador",
      "contratação", "transferência", "janela", "var", "arbitragem",
    ],
  },
  politics: {
    primary: [
      "eleição", "eleições", "presidente", "governo federal", "congresso",
      "senado", "câmara dos deputados", "stf", "supremo", "impeachment",
      "reforma tributária", "reforma ministerial", "pec", "cpi",
    ],
    secondary: [
      "deputado", "ministro", "política", "lula", "bolsonaro", "votação",
      "reforma", "prefeito", "governador", "tse", "urna", "voto",
      "aprovação", "rejeição", "pesquisa eleitoral", "bancada", "oposição",
      "base aliada", "medida provisória", "veto", "sanção",
    ],
  },
  crypto: {
    primary: [
      "bitcoin", "ethereum", "crypto", "criptomoeda", "blockchain",
      "halving", "etf crypto", "etf bitcoin", "regulação crypto",
    ],
    secondary: [
      "btc", "eth", "altcoin", "binance", "solana", "dogecoin", "nft",
      "defi", "token", "stablecoin", "usdt", "usdc", "xrp", "cardano",
      "polkadot", "avalanche", "arbitrum", "layer 2", "web3", "mineração",
      "carteira digital", "exchange", "descentralizado",
    ],
  },
  economy: {
    primary: [
      "pib", "inflação", "selic", "copom", "banco central", "ipca",
      "dólar", "câmbio", "ibovespa", "recessão", "juros",
    ],
    secondary: [
      "bolsa", "emprego", "desemprego", "mercado financeiro", "wall street",
      "nasdaq", "s&p", "fed", "taxa de juros", "fiscal", "dívida pública",
      "superávit", "déficit", "commodities", "petróleo", "petrobras",
      "vale", "ações", "investimento", "fundos", "tesouro direto",
      "rentabilidade", "exportação", "importação", "balança comercial",
    ],
  },
  culture: {
    primary: [
      "oscar", "grammy", "bbb", "big brother", "rock in rio", "lollapalooza",
      "netflix", "disney+", "streaming", "reality show", "novela",
    ],
    secondary: [
      "filme", "cinema", "música", "série", "show", "artista", "festival",
      "livro", "tv", "celebridade", "anitta", "taylor swift", "beyoncé",
      "bilheteria", "álbum", "single", "turnê", "premiação", "indicação",
      "cancelamento", "viral", "tiktok", "meme", "influenciador",
      "podcast", "youtube", "twitch", "game awards", "k-pop",
    ],
  },
  technology: {
    primary: [
      "inteligência artificial", "openai", "chatgpt", "google ai", "gemini",
      "apple", "meta", "tesla", "spacex", "microsoft", "nvidia",
    ],
    secondary: [
      "ia", "ai", "iphone", "samsung", "startup", "tecnologia", "app",
      "software", "elon musk", "mark zuckerberg", "tim cook", "sam altman",
      "llm", "gpt", "claude", "modelo de linguagem", "robô", "automação",
      "computação quântica", "chip", "semicondutor", "5g", "6g",
      "realidade virtual", "vr", "ar", "metaverso", "ipo", "unicórnio",
      "cibersegurança", "vazamento", "regulação tech", "antitruste",
    ],
  },
};

function classifyCategory(topic: string): { category: string; score: number } | null {
  const lower = topic.toLowerCase();
  let bestCategory: string | null = null;
  let bestScore = 0;

  for (const [category, { primary, secondary }] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of primary) {
      if (lower.includes(kw)) score += 3;
    }
    for (const kw of secondary) {
      if (lower.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore > 0 ? { category: bestCategory!, score: bestScore } : null;
}

// ─── Hashing & Dedup ─────────────────────────────────────────────────────────

async function hashTopic(topic: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(topic.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Extract 3+ char words, sorted, for fuzzy dedup */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .sort();
}

/** Jaccard similarity between two keyword sets (0-1) */
function keywordSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ─── Exclusion heuristics ────────────────────────────────────────────────────

const EXCLUSION_PATTERNS = [
  // Generic / non-actionable
  /^(veja|confira|saiba|entenda|descubra|aprenda)\b/i,
  /\b(fotos?|vídeos?|galeria|assista|ao vivo)\b/i,
  // Obituaries / accidents (hard to make markets)
  /\b(morre|falece|faleceu|obituário|acidente fatal)\b/i,
  // Clickbait
  /\b(você não vai acreditar|chocante|inacreditável|surpreendente)\b/i,
  // Too old / past references
  /\b(ontem|semana passada|mês passado|ano passado)\b/i,
];

function shouldExclude(topic: string): string | null {
  for (const pattern of EXCLUSION_PATTERNS) {
    if (pattern.test(topic)) return `Matches exclusion pattern: ${pattern.source}`;
  }
  if (topic.length < 15) return "Topic too short";
  if (topic.length > 300) return "Topic too long";
  return null;
}

// ─── Trend Sources ───────────────────────────────────────────────────────────

interface TrendTopic {
  topic: string;
  source: "google_trends" | "rss";
  category: string;
  categoryScore: number;
  hash: string;
}

const RSS_FEEDS = [
  { url: "https://g1.globo.com/rss/g1/", weight: 1.0 },
  { url: "https://g1.globo.com/rss/g1/economia/", weight: 1.1 },
  { url: "https://g1.globo.com/rss/g1/politica/", weight: 1.1 },
  { url: "https://g1.globo.com/rss/g1/tecnologia/", weight: 1.1 },
  { url: "https://g1.globo.com/rss/g1/pop-arte/", weight: 1.0 },
  { url: "https://rss.uol.com.br/feed/noticias.xml", weight: 0.9 },
  { url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml", weight: 1.0 },
];

function extractTextFromXml(xml: string, tag: string): string[] {
  const regex = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([^\\]]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*?)<\\/${tag}>`,
    "gi"
  );
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

  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "FUTRA-Bot/1.0" },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const titles = extractTextFromXml(xml, "title");

      for (const title of titles.slice(1, 10)) {
        if (!title || title.length < 15) continue;

        const normalized = title.toLowerCase().trim();
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        const exclusion = shouldExclude(title);
        if (exclusion) {
          console.log(`Excluded RSS: "${title}" — ${exclusion}`);
          continue;
        }

        const classified = classifyCategory(title);
        if (!classified) continue;

        const hash = await hashTopic(`rss:${title}`);
        trends.push({
          topic: title,
          source: "rss",
          category: classified.category,
          categoryScore: classified.score,
          hash,
        });
      }
    } catch (e) {
      console.error(`RSS error ${feed.url}:`, e);
    }
  }

  return trends;
}

async function fetchGoogleTrends(apiKey: string): Promise<TrendTopic[]> {
  try {
    const url = `https://serpapi.com/search.json?engine=google_trends_trending_now&geo=BR&api_key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("SerpApi error:", res.status);
      return [];
    }
    const data = await res.json();
    const trends: TrendTopic[] = [];

    const trendingSearches = data.trending_searches || data.daily_searches || [];
    for (const item of trendingSearches.slice(0, 15)) {
      const topic = item.query || item.title?.query || item.title || "";
      if (!topic || topic.length < 3) continue;

      const exclusion = shouldExclude(topic);
      if (exclusion) continue;

      const classified = classifyCategory(topic);
      if (!classified) continue;

      const hash = await hashTopic(`google_trends:${topic}`);
      trends.push({
        topic,
        source: "google_trends",
        category: classified.category,
        categoryScore: classified.score,
        hash,
      });
    }

    return trends;
  } catch (e) {
    console.error("Google Trends fetch error:", e);
    return [];
  }
}

// ─── Semantic Dedup ──────────────────────────────────────────────────────────

interface RecentMarket {
  question: string;
  keywords: string[];
}

async function checkSemanticDuplicate(
  question: string,
  recentMarkets: RecentMarket[]
): Promise<{ isDuplicate: boolean; similarTo?: string; similarity: number }> {
  const keywords = extractKeywords(question);

  for (const market of recentMarkets) {
    const sim = keywordSimilarity(keywords, market.keywords);
    if (sim >= 0.45) {
      return { isDuplicate: true, similarTo: market.question, similarity: sim };
    }
  }

  return { isDuplicate: false, similarity: 0 };
}

// ─── AI Generation with Quality Scoring ──────────────────────────────────────

interface AIMarketResult {
  question: string;
  options: string[];
  end_date_days: number;
  resolution_source: string;
  description: string;
  quality_score: number;
  quality_reasoning: string;
  virality_score: number;
  shareability_hook: string;
}

const SYSTEM_PROMPT = `Você é o gerador de mercados da FUTRA, a principal plataforma de previsões do Brasil.
Dado um tópico em tendência, crie um mercado preditivo de alta qualidade em Português Brasileiro.

REGRAS OBRIGATÓRIAS:
1. A pergunta DEVE ter resultado verificável e binário/objetivo (sim/não, quem, quanto, etc.)
2. NUNCA crie perguntas sobre opiniões, sentimentos ou coisas não-mensuráveis
3. A resolução deve ser possível com fontes públicas (placar oficial, decisão judicial, cotação, etc.)
4. Horizonte temporal: 3 a 14 dias. Prefira prazos curtos e urgentes
5. 2 a 4 opções claras e mutuamente exclusivas (sempre incluir desfechos opostos)
6. Linguagem direta e analítica, NUNCA sensacionalista
7. A pergunta deve ser compartilhável — algo que as pessoas debateriam com amigos
8. Evite perguntas sobre eventos já resolvidos ou em andamento sem desfecho claro

CRITÉRIOS DE QUALIDADE (avalie honestamente):
- Objetividade: resultado 100% verificável? (0-1)
- Timing: evento é atual e relevante agora? (0-1)
- Engajamento: pessoas apostariam nisso? Gera debate? (0-1)
- Resolubilidade: existe fonte clara para resolver? (0-1)
- Viralidade: é compartilhável? Gera conversa? (0-1)

QUALITY_SCORE = média ponderada destes 5 critérios (0.0 a 1.0)
- Abaixo de 0.5: mercado ruim, não deveria ser publicado
- 0.5-0.7: mercado aceitável, precisa revisão humana
- 0.7-0.85: bom mercado
- 0.85+: excelente mercado, pode ir ao ar automaticamente

VIRALITY_SCORE (0.0 a 1.0):
- 0.0: ninguém compartilharia
- 0.5: algumas pessoas se interessariam
- 1.0: viral, todo mundo quer opinar

Forneça um shareability_hook: frase curta (~10 palavras) que funcionaria como chamada no Twitter/Instagram.

Forneça quality_reasoning: 1 frase explicando por que deu esse score.`;

async function generateMarketFromAI(
  topic: string,
  category: string,
  apiKey: string
): Promise<AIMarketResult | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Tópico em tendência: "${topic}"\nCategoria: "${category}"\n\nCrie o melhor mercado preditivo possível para este tópico. Seja rigoroso na avaliação de qualidade.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_market",
              description: "Create a high-quality prediction market from a trending topic",
              parameters: {
                type: "object",
                properties: {
                  question: {
                    type: "string",
                    description: "Market question in PT-BR. Must be objective and verifiable.",
                  },
                  options: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 2,
                    maxItems: 4,
                    description: "2-4 mutually exclusive answer options",
                  },
                  end_date_days: {
                    type: "number",
                    description: "Days until market closes (3-14)",
                  },
                  resolution_source: {
                    type: "string",
                    description: "Specific verification source (e.g. 'Placar oficial CBF', 'Decisão publicada no DOU')",
                  },
                  description: {
                    type: "string",
                    description: "Brief context about the topic (1-2 sentences)",
                  },
                  quality_score: {
                    type: "number",
                    description: "Overall quality score from 0.0 to 1.0 based on objectivity, timing, engagement, resolvability, virality",
                  },
                  quality_reasoning: {
                    type: "string",
                    description: "One sentence explaining the quality assessment",
                  },
                  virality_score: {
                    type: "number",
                    description: "How shareable/viral this market is (0.0-1.0)",
                  },
                  shareability_hook: {
                    type: "string",
                    description: "Short catchy phrase (~10 words) for social media sharing",
                  },
                },
                required: [
                  "question", "options", "end_date_days", "resolution_source",
                  "description", "quality_score", "quality_reasoning",
                  "virality_score", "shareability_hook",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_market" } },
      }),
    });

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
    if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length < 2) {
      console.error("Invalid AI output:", parsed);
      return null;
    }

    return {
      question: parsed.question,
      options: parsed.options,
      end_date_days: Math.min(14, Math.max(3, parsed.end_date_days || 7)),
      resolution_source: parsed.resolution_source || "",
      description: parsed.description || "",
      quality_score: Math.min(1, Math.max(0, parsed.quality_score || 0)),
      quality_reasoning: parsed.quality_reasoning || "",
      virality_score: Math.min(1, Math.max(0, parsed.virality_score || 0)),
      shareability_hook: parsed.shareability_hook || "",
    };
  } catch (e) {
    console.error("AI generation error:", e);
    return null;
  }
}

// ─── Independent AI Reviewer ─────────────────────────────────────────────────

const REVIEWER_PROMPT = `Você é um revisor INDEPENDENTE e RIGOROSO de mercados preditivos da FUTRA.
Você NÃO criou este mercado — sua função é avaliá-lo criticamente.

Avalie CADA critério de 0.0 a 1.0 com honestidade brutal:

1. objectivity (0-1): O resultado é 100% verificável com dados públicos? Perguntas de opinião = 0. Perguntas com resultado binário claro = 0.9+
2. timing (0-1): O evento é atual e relevante AGORA? Evento passado = 0. Evento das próximas 2 semanas = 0.8+
3. resolvability (0-1): Existe fonte ESPECÍFICA e confiável para verificar? Fonte vaga = 0.3. "Placar oficial CBF" = 0.9+
4. engagement (0-1): Brasileiros apostariam nisso? Tema de nicho = 0.2. Futebol/BBB/eleição = 0.8+
5. clarity (0-1): A pergunta é clara, sem ambiguidade? Pode ser interpretada de várias formas = 0.3. Cristalina = 0.9+

REGRAS DE PONTUAÇÃO (seja duro):
- Se a pergunta menciona datas do passado → timing = 0.0
- Se não há fonte verificável concreta → resolvability ≤ 0.3
- Se a pergunta é sobre algo que ninguém discutiria com amigos → engagement ≤ 0.3
- Se a pergunta tem "será que", opinião, ou sentimento → objectivity ≤ 0.2
- Score médio real deve ficar entre 0.4 e 0.75 para a maioria dos mercados
- Apenas mercados EXCEPCIONAIS devem ter score > 0.85
- NUNCA dê 1.0 em qualquer critério individual`;

interface ReviewScores {
  objectivity: number;
  timing: number;
  resolvability: number;
  engagement: number;
  clarity: number;
  overall: number;
  reasoning: string;
}

async function reviewMarketWithAI(
  question: string,
  options: string[],
  description: string,
  resolutionSource: string,
  category: string,
  apiKey: string
): Promise<ReviewScores | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: REVIEWER_PROMPT },
          {
            role: "user",
            content: `Avalie este mercado preditivo:\n\nPergunta: "${question}"\nOpções: ${JSON.stringify(options)}\nDescrição: "${description}"\nFonte de resolução: "${resolutionSource}"\nCategoria: ${category}\nData de hoje: ${new Date().toISOString().split("T")[0]}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "review_market",
              description: "Submit quality review scores for a prediction market",
              parameters: {
                type: "object",
                properties: {
                  objectivity: { type: "number", description: "Is the outcome 100% verifiable? (0.0-1.0)" },
                  timing: { type: "number", description: "Is the event current and timely? (0.0-1.0)" },
                  resolvability: { type: "number", description: "Is there a specific reliable source? (0.0-1.0)" },
                  engagement: { type: "number", description: "Would Brazilians bet on this? (0.0-1.0)" },
                  clarity: { type: "number", description: "Is the question unambiguous? (0.0-1.0)" },
                  reasoning: { type: "string", description: "1-2 sentences explaining the scores" },
                },
                required: ["objectivity", "timing", "resolvability", "engagement", "clarity", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "review_market" } },
      }),
    });

    if (!res.ok) {
      console.error("Reviewer AI error:", res.status);
      return null;
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return null;

    const p = JSON.parse(toolCall.function.arguments);
    const clamp = (v: number) => Math.min(1, Math.max(0, v || 0));

    const scores = {
      objectivity: clamp(p.objectivity),
      timing: clamp(p.timing),
      resolvability: clamp(p.resolvability),
      engagement: clamp(p.engagement),
      clarity: clamp(p.clarity),
    };

    // Weighted average: objectivity and resolvability matter most
    const overall =
      scores.objectivity * 0.25 +
      scores.timing * 0.20 +
      scores.resolvability * 0.25 +
      scores.engagement * 0.15 +
      scores.clarity * 0.15;

    return {
      ...scores,
      overall: Math.round(overall * 100) / 100,
      reasoning: p.reasoning || "",
    };
  } catch (e) {
    console.error("Reviewer error:", e);
    return null;
  }
}

// ─── Post-generation validation (heuristic + AI review) ──────────────────────

interface ValidationResult {
  passed: boolean;
  adjustedScore: number;
  penalties: string[];
  reviewScores?: ReviewScores;
}

function computeHeuristicPenalties(
  ai: AIMarketResult,
  categoryScore: number,
  source: "google_trends" | "rss"
): { penalties: string[]; delta: number } {
  const penalties: string[] = [];
  let delta = 0;

  // ── Hard penalties ──

  // Question length
  if (ai.question.length < 20) {
    delta -= 0.20;
    penalties.push("Question too short (<20 chars)");
  } else if (ai.question.length < 40) {
    delta -= 0.05;
    penalties.push("Question somewhat short");
  }
  if (ai.question.length > 200) {
    delta -= 0.05;
    penalties.push("Question too long (>200 chars)");
  }

  // Options validation
  if (ai.options.length < 2) {
    delta -= 0.30;
    penalties.push("Less than 2 options");
  }
  const uniqueOpts = new Set(ai.options.map((o) => o.toLowerCase().trim()));
  if (uniqueOpts.size < ai.options.length) {
    delta -= 0.20;
    penalties.push("Duplicate option labels");
  }
  // Options too similar (short edit distance proxy: same first 10 chars)
  const optPrefixes = ai.options.map((o) => o.toLowerCase().trim().slice(0, 10));
  if (new Set(optPrefixes).size < optPrefixes.length) {
    delta -= 0.10;
    penalties.push("Options too similar");
  }

  // No or weak resolution source
  if (!ai.resolution_source || ai.resolution_source.length < 5) {
    delta -= 0.15;
    penalties.push("Missing resolution source");
  } else if (ai.resolution_source.length < 15) {
    delta -= 0.05;
    penalties.push("Vague resolution source");
  }

  // Vague question patterns
  const vaguePatterns = [
    { p: /será que/i, w: 0.20 },
    { p: /o que.*acha/i, w: 0.25 },
    { p: /qual.*sua.*opinião/i, w: 0.25 },
    { p: /você.*acredita/i, w: 0.20 },
    { p: /pode.*acontecer/i, w: 0.10 },
    { p: /é possível que/i, w: 0.10 },
  ];
  for (const { p, w } of vaguePatterns) {
    if (p.test(ai.question)) {
      delta -= w;
      penalties.push(`Vague pattern: ${p.source}`);
      break;
    }
  }

  // Past-date references in the question
  const yearMatch = ai.question.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    const currentYear = new Date().getFullYear();
    if (year < currentYear) {
      delta -= 0.25;
      penalties.push(`References past year (${year})`);
    } else if (year === currentYear) {
      // Check for past months
      const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      const currentMonth = new Date().getMonth();
      for (let i = 0; i < currentMonth; i++) {
        if (ai.question.toLowerCase().includes(monthNames[i]) && ai.question.includes(String(year))) {
          delta -= 0.20;
          penalties.push(`References past month (${monthNames[i]} ${year})`);
          break;
        }
      }
    }
  }

  // Description too short (low effort)
  if (!ai.description || ai.description.length < 20) {
    delta -= 0.05;
    penalties.push("Description too brief");
  }

  // ── Bonuses ──
  if (source === "google_trends") {
    delta += 0.03;
  }
  if (categoryScore >= 5) {
    delta += 0.05;
  } else if (categoryScore >= 3) {
    delta += 0.03;
  }

  // Question ends with "?" (good form)
  if (ai.question.trim().endsWith("?")) {
    delta += 0.02;
  }

  return { penalties, delta };
}

async function validateCandidate(
  ai: AIMarketResult,
  categoryScore: number,
  source: "google_trends" | "rss",
  apiKey: string
): Promise<ValidationResult> {
  // Step 1: Heuristic penalties (deterministic)
  const { penalties, delta } = computeHeuristicPenalties(ai, categoryScore, source);

  // Step 2: Independent AI review (ignore generator's self-score)
  const review = await reviewMarketWithAI(
    ai.question, ai.options, ai.description,
    ai.resolution_source, "category", apiKey
  );

  let finalScore: number;

  if (review) {
    // Use reviewer's score as base, apply heuristic delta
    finalScore = review.overall + delta;
    console.log(`Review scores: obj=${review.objectivity} tim=${review.timing} res=${review.resolvability} eng=${review.engagement} cla=${review.clarity} → overall=${review.overall} | heuristic delta=${delta.toFixed(2)} | final=${(review.overall + delta).toFixed(2)}`);
    console.log(`Review reasoning: ${review.reasoning}`);
  } else {
    // Fallback: use deflated base score + delta
    // Start from 0.55 (neutral) instead of AI's inflated self-score
    finalScore = 0.55 + delta;
    penalties.push("AI review unavailable, using fallback base");
    console.log(`Fallback score: 0.55 + delta(${delta.toFixed(2)}) = ${finalScore.toFixed(2)}`);
  }

  finalScore = Math.min(1, Math.max(0, finalScore));
  finalScore = Math.round(finalScore * 100) / 100;

  return {
    passed: finalScore >= MIN_QUALITY_THRESHOLD,
    adjustedScore: finalScore,
    penalties,
    reviewScores: review || undefined,
  };
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(clientIp, 1, 600_000);
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

    // ── 1. Fetch trends from all sources ──
    const trendPromises: Promise<TrendTopic[]>[] = [fetchRssHeadlines()];
    if (serpApiKey) trendPromises.push(fetchGoogleTrends(serpApiKey));

    const trendResults = await Promise.all(trendPromises);
    const allTrends = trendResults.flat();

    if (allTrends.length === 0) {
      return jsonResponse(headers, { created: 0, message: "No suitable trends found" });
    }

    // ── 2. Hash dedup against scheduled_markets ──
    const hashes = allTrends.map((t) => t.hash);
    const { data: existingHashes } = await adminClient
      .from("scheduled_markets")
      .select("topic_hash")
      .in("topic_hash", hashes);

    const existingSet = new Set((existingHashes || []).map((e: any) => e.topic_hash));
    let newTrends = allTrends.filter((t) => !existingSet.has(t.hash));

    if (newTrends.length === 0) {
      return jsonResponse(headers, { created: 0, message: "All trends already processed" });
    }

    // ── 3. Semantic dedup against recent markets + candidates ──
    const { data: recentMarkets } = await adminClient
      .from("markets")
      .select("question")
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: recentCandidates } = await adminClient
      .from("scheduled_markets")
      .select("generated_question")
      .not("generated_question", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    const recentKeywords: RecentMarket[] = [
      ...(recentMarkets || []).map((m: any) => ({
        question: m.question,
        keywords: extractKeywords(m.question),
      })),
      ...(recentCandidates || [])
        .filter((c: any) => c.generated_question)
        .map((c: any) => ({
          question: c.generated_question,
          keywords: extractKeywords(c.generated_question),
        })),
    ];

    // Pre-filter trends by semantic similarity to existing topics
    const semanticFiltered: TrendTopic[] = [];
    for (const trend of newTrends) {
      const trendKw = extractKeywords(trend.topic);
      let isDup = false;
      for (const rm of recentKeywords) {
        if (keywordSimilarity(trendKw, rm.keywords) >= 0.4) {
          console.log(`Semantic dedup: "${trend.topic}" ≈ "${rm.question}"`);
          isDup = true;
          break;
        }
      }
      if (!isDup) semanticFiltered.push(trend);
    }

    newTrends = semanticFiltered;
    if (newTrends.length === 0) {
      return jsonResponse(headers, { created: 0, message: "All trends semantically similar to existing" });
    }

    // ── 4. Sort by category score (higher = more relevant) ──
    newTrends.sort((a, b) => b.categoryScore - a.categoryScore);

    const toProcess = newTrends.slice(0, MAX_CANDIDATES_PER_RUN);
    const results: {
      id: string;
      question: string;
      topic: string;
      quality_score: number;
      status: string;
      auto_published: boolean;
    }[] = [];

    // ── 5. Generate + validate + insert candidates ──
    for (const trend of toProcess) {
      const aiResult = await generateMarketFromAI(trend.topic, trend.category, lovableApiKey);

      if (!aiResult) {
        await adminClient.from("scheduled_markets").insert({
          source: trend.source,
          source_topic: trend.topic,
          topic_hash: trend.hash,
          category: trend.category,
          status: "skipped",
        });
        continue;
      }

      // Validate and adjust score
      const validation = validateCandidate(aiResult, trend.categoryScore, trend.source);
      if (!validation.passed) {
        console.log(`Quality gate failed for "${trend.topic}": score=${validation.adjustedScore}, penalties=${validation.penalties.join(", ")}`);
        await adminClient.from("scheduled_markets").insert({
          source: trend.source,
          source_topic: trend.topic,
          topic_hash: trend.hash,
          category: trend.category,
          status: "skipped",
          generated_question: aiResult.question,
          confidence_score: validation.adjustedScore,
        });
        continue;
      }

      // Semantic dedup against the AI-generated question too
      const semDup = await checkSemanticDuplicate(aiResult.question, recentKeywords);
      if (semDup.isDuplicate) {
        console.log(`Semantic dedup (AI question): "${aiResult.question}" ≈ "${semDup.similarTo}" (${semDup.similarity.toFixed(2)})`);
        await adminClient.from("scheduled_markets").insert({
          source: trend.source,
          source_topic: trend.topic,
          topic_hash: trend.hash,
          category: trend.category,
          status: "skipped",
          generated_question: aiResult.question,
          confidence_score: validation.adjustedScore,
        });
        continue;
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + aiResult.end_date_days);

      const optionsJson = aiResult.options.map((label) => ({ label }));

      const shouldAutoPublish = validation.adjustedScore >= AUTO_PUBLISH_THRESHOLD;
      const candidateStatus = shouldAutoPublish ? "approved" : "new";

      // Insert candidate into scheduled_markets
      const { data: candidate, error: insertErr } = await adminClient
        .from("scheduled_markets")
        .insert({
          source: trend.source,
          source_topic: trend.topic,
          topic_hash: trend.hash,
          category: trend.category,
          status: candidateStatus,
          generated_question: aiResult.question,
          generated_description: aiResult.description,
          generated_options: optionsJson,
          resolution_source: aiResult.resolution_source,
          confidence_score: validation.adjustedScore,
          end_date: endDate.toISOString(),
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Candidate insert error:", insertErr);
        continue;
      }

      let autoPublished = false;

      // Auto-publish if above threshold
      if (shouldAutoPublish) {
        const { data: market, error: marketErr } = await adminClient
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
            resolution_rules: aiResult.resolution_source ? `Fonte: ${aiResult.resolution_source}` : "",
          })
          .select("id")
          .single();

        if (!marketErr && market) {
          await adminClient
            .from("scheduled_markets")
            .update({
              status: "published",
              market_id: market.id,
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", candidate.id);
          autoPublished = true;
        }
      }

      // Add to recent keywords to prevent intra-batch duplicates
      recentKeywords.push({
        question: aiResult.question,
        keywords: extractKeywords(aiResult.question),
      });

      await adminClient.from("admin_logs").insert({
        admin_user_id: "00000000-0000-0000-0000-000000000001",
        action_type: autoPublished ? "auto_market_published" : "auto_candidate_created",
        entity_type: "scheduled_market",
        entity_id: candidate.id,
        description: `[Q:${validation.adjustedScore}] ${trend.source}: "${trend.topic}" → "${aiResult.question}"${validation.penalties.length ? ` | penalties: ${validation.penalties.join(", ")}` : ""}`,
      });

      results.push({
        id: candidate.id,
        question: aiResult.question,
        topic: trend.topic,
        quality_score: validation.adjustedScore,
        status: autoPublished ? "published" : "new",
        auto_published: autoPublished,
      });
    }

    return jsonResponse(headers, {
      candidates_created: results.length,
      auto_published: results.filter((r) => r.auto_published).length,
      pending_review: results.filter((r) => !r.auto_published).length,
      results,
      trends_found: allTrends.length,
      new_trends: newTrends.length,
    });
  } catch (error) {
    console.error("create-markets-from-trends error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});

function jsonResponse(headers: Record<string, string>, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
