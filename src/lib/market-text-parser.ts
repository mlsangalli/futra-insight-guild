/**
 * Parses structured text into market draft fields.
 * Highly flexible: accepts varied formatting, spacing, casing, and accents.
 */

const CATEGORIES = ['politics', 'economy', 'crypto', 'football', 'culture', 'technology'];

// Single-value fields: only first non-empty line is used
const SINGLE_VALUE_FIELDS = new Set(['end_date', 'category', 'slug']);

// Ordered by specificity (longest first) to avoid partial matches
const FIELD_PATTERNS: { pattern: RegExp; field: string }[] = [
  // Options (must come before "opções" alone)
  { pattern: /^op[cç][oõ]es\s+de\s+resposta$/i, field: 'options' },
  { pattern: /^op[cç][oõ]es$/i, field: 'options' },
  { pattern: /^opcoes$/i, field: 'options' },
  { pattern: /^options$/i, field: 'options' },
  { pattern: /^respostas$/i, field: 'options' },
  { pattern: /^alternativas$/i, field: 'options' },
  
  // Resolution source (before "fonte" alone)
  { pattern: /^fonte\s+de\s+resolu[cç][aã]o$/i, field: 'resolution_source' },
  { pattern: /^fonte\s+de\s+verifica[cç][aã]o$/i, field: 'resolution_source' },
  { pattern: /^resolution\s*source$/i, field: 'resolution_source' },
  { pattern: /^fonte$/i, field: 'resolution_source' },
  
  // Resolution rules (before "regras" alone)
  { pattern: /^regras\s+de\s+resolu[cç][aã]o$/i, field: 'resolution_rules' },
  { pattern: /^crit[eé]rios?\s+de\s+resolu[cç][aã]o$/i, field: 'resolution_rules' },
  { pattern: /^resolution\s*rules$/i, field: 'resolution_rules' },
  { pattern: /^regras$/i, field: 'resolution_rules' },
  
  // End date (before "data" alone)
  { pattern: /^data\s+limite$/i, field: 'end_date' },
  { pattern: /^data\s+de\s+encerramento$/i, field: 'end_date' },
  { pattern: /^data\s+final$/i, field: 'end_date' },
  { pattern: /^prazo$/i, field: 'end_date' },
  { pattern: /^deadline$/i, field: 'end_date' },
  { pattern: /^end\s*date$/i, field: 'end_date' },
  { pattern: /^data$/i, field: 'end_date' },
  { pattern: /^vencimento$/i, field: 'end_date' },
  { pattern: /^encerramento$/i, field: 'end_date' },
  
  // Question
  { pattern: /^pergunta$/i, field: 'question' },
  { pattern: /^question$/i, field: 'question' },
  { pattern: /^t[ií]tulo$/i, field: 'question' },
  { pattern: /^title$/i, field: 'question' },
  { pattern: /^mercado$/i, field: 'question' },
  
  // Description
  { pattern: /^descri[cç][aã]o$/i, field: 'description' },
  { pattern: /^descricao$/i, field: 'description' },
  { pattern: /^description$/i, field: 'description' },
  { pattern: /^detalhes$/i, field: 'description' },
  { pattern: /^sobre$/i, field: 'description' },
  
  // Category
  { pattern: /^categoria$/i, field: 'category' },
  { pattern: /^category$/i, field: 'category' },
  { pattern: /^tipo$/i, field: 'category' },
  
  // Slug
  { pattern: /^slug$/i, field: 'slug' },
  { pattern: /^url$/i, field: 'slug' },
  
  // Tags
  { pattern: /^tags$/i, field: 'tags' },
  { pattern: /^palavras[- ]?chave$/i, field: 'tags' },
  { pattern: /^keywords$/i, field: 'tags' },
  
  // Thumbnail & image fields — recognized to prevent contamination
  { pattern: /^thumbnail$/i, field: 'thumbnail' },
  { pattern: /^imagem(\s+do\s+mercado)?$/i, field: 'thumbnail' },
  { pattern: /^image[mn]?$/i, field: 'thumbnail' },
  { pattern: /^capa$/i, field: 'thumbnail' },
  { pattern: /^texto\s+alternativo/i, field: '_thumbnail_alt' },
  { pattern: /^alt(\s+text)?$/i, field: '_thumbnail_alt' },
  { pattern: /^fonte\s+da\s+imagem$/i, field: '_thumbnail_source' },
  { pattern: /^image\s*source$/i, field: '_thumbnail_source' },
  { pattern: /^cr[eé]ditos?\s+(da\s+)?imagem$/i, field: '_thumbnail_source' },
];

export interface MarketDraft {
  question: string;
  description: string;
  category: string;
  end_date: string;
  resolution_source: string;
  resolution_rules: string;
  options: string[];
  slug: string;
  tags: string[];
  thumbnail: string;
}

export interface ParseResult {
  draft: MarketDraft;
  errors: string[];
  warnings: string[];
}

function matchFieldName(raw: string): string | null {
  const cleaned = raw.trim();
  for (const { pattern, field } of FIELD_PATTERNS) {
    if (pattern.test(cleaned)) return field;
  }
  return null;
}

/**
 * Checks if a line looks like a field header (i.e. "SomeLabel:" pattern).
 * Returns true if the text before the colon looks like a label (letters/spaces only, < 50 chars).
 */
function looksLikeFieldHeader(line: string): boolean {
  const colonIdx = line.indexOf(':');
  if (colonIdx <= 0 || colonIdx > 50) return false;
  const candidateKey = line.slice(0, colonIdx).trim();
  // Must be letters, accents, spaces, hyphens — no digits, URLs, etc.
  return /^[\p{L}\p{M}\s()-]+$/u.test(candidateKey) && candidateKey.length >= 2;
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();

  // dd/MM/yyyy HH:mm or dd-MM-yyyy HH:mm
  const brFull = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (brFull) {
    const [, d, m, y, h, min] = brFull;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min}`;
  }

  // dd/MM/yyyy or dd-MM-yyyy or dd.MM.yyyy
  const brDate = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (brDate) {
    const [, d, m, y] = brDate;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00`;
  }

  // yyyy-MM-ddTHH:mm
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) return trimmed.slice(0, 16);

  // yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T12:00`;

  // "October 4, 2026", "4 de outubro de 2026", etc — native fallback
  const d = new Date(trimmed);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  }

  return null;
}

function parseOptions(raw: string): string[] {
  // Try splitting by newline first
  let lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  
  // If only one line, try splitting by semicolons or commas (but not if it looks like a sentence)
  if (lines.length === 1) {
    if (lines[0].includes(';')) {
      lines = lines[0].split(';').map(l => l.trim()).filter(Boolean);
    } else if (lines[0].includes(',') && lines[0].split(',').length >= 2) {
      lines = lines[0].split(',').map(l => l.trim()).filter(Boolean);
    }
  }
  
  return lines
    .map(line => line.replace(/^[-–—•*►▸▹→]\s*/, '')) // bullets
    .map(line => line.replace(/^\d+[.):\-]\s*/, ''))    // numbering
    .map(line => line.replace(/^\[.\]\s*/, ''))          // checkboxes
    .map(line => line.trim())
    .filter(Boolean);
}

function generateSlug(question: string): string {
  return question
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '');
}

/** Simple Levenshtein distance */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function matchCategory(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (CATEGORIES.includes(cleaned)) return cleaned;

  const map: Record<string, string> = {
    'politica': 'politics', 'politicas': 'politics', 'pol': 'politics',
    'economia': 'economy', 'economica': 'economy', 'econ': 'economy', 'financas': 'economy', 'financeiro': 'economy',
    'futebol': 'football', 'esporte': 'football', 'esportes': 'football', 'sports': 'football', 'sport': 'football',
    'tecnologia': 'technology', 'tech': 'technology', 'tec': 'technology',
    'cultura': 'culture', 'entretenimento': 'culture', 'entertainment': 'culture',
    'cripto': 'crypto', 'criptomoeda': 'crypto', 'criptomoedas': 'crypto', 'bitcoin': 'crypto', 'blockchain': 'crypto',
  };
  if (map[cleaned]) return map[cleaned];

  // Fuzzy match: try Levenshtein against all known keys and category names
  const allTargets = [...CATEGORIES, ...Object.keys(map)];
  let bestMatch: string | null = null;
  let bestDist = Infinity;
  for (const target of allTargets) {
    const dist = levenshtein(cleaned, target);
    if (dist < bestDist) {
      bestDist = dist;
      bestMatch = target;
    }
  }
  if (bestMatch && bestDist <= 2) {
    return CATEGORIES.includes(bestMatch) ? bestMatch : map[bestMatch] || null;
  }

  return null;
}

export function parseMarketText(text: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fields: Record<string, string> = {};

  const lines = text.split('\n');
  let currentField: string | null = null;
  let currentValue: string[] = [];

  const saveCurrentField = () => {
    if (!currentField) return;
    let value: string;
    if (SINGLE_VALUE_FIELDS.has(currentField)) {
      // Only use the first non-empty line
      value = currentValue.find(l => l.trim() !== '')?.trim() || '';
    } else {
      value = currentValue.join('\n').trim();
    }
    fields[currentField] = value;
    currentField = null;
    currentValue = [];
  };

  for (const line of lines) {
    // Try to detect "Field: value"
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && colonIdx <= 50) {
      const candidateKey = line.slice(0, colonIdx);
      const candidateValue = line.slice(colonIdx + 1);
      
      if (/^[\p{L}\p{M}\s()-]+$/u.test(candidateKey.trim()) && candidateKey.trim().length >= 2) {
        const fieldName = matchFieldName(candidateKey);
        if (fieldName) {
          // Save previous field
          saveCurrentField();
          currentField = fieldName;
          currentValue = candidateValue.trim() ? [candidateValue.trim()] : [];
          continue;
        }
        
        // Unrecognized but looks like a header → stop current field, discard this line
        if (looksLikeFieldHeader(line)) {
          saveCurrentField();
          // Store in a throwaway key so it doesn't contaminate anything
          currentField = `_unknown_${candidateKey.trim().toLowerCase()}`;
          currentValue = candidateValue.trim() ? [candidateValue.trim()] : [];
          continue;
        }
      }
    }
    
    // Also catch lines that look like headers even without matching the colon heuristic above
    if (!currentField || !SINGLE_VALUE_FIELDS.has(currentField)) {
      // Continuation of current field
      if (currentField) {
        currentValue.push(line);
      }
    }
    // If currentField is single-value, skip extra lines silently
  }
  // Save last field
  saveCurrentField();

  // Build draft
  const question = fields.question?.trim() || '';
  const description = fields.description?.trim() || '';
  const resolutionSource = fields.resolution_source?.trim() || '';
  const resolutionRules = fields.resolution_rules?.trim() || '';
  const slug = fields.slug?.trim() || (question ? generateSlug(question) : '');
  const tags = fields.tags
    ? fields.tags.split(/[,;]/).map(t => t.trim()).filter(Boolean)
    : [];
  const thumbnail = fields.thumbnail?.trim() || '';

  // Category
  let category = '';
  if (fields.category) {
    const matched = matchCategory(fields.category);
    if (matched) {
      category = matched;
    } else {
      errors.push(`Categoria "${fields.category}" não reconhecida. Use: ${CATEGORIES.join(', ')}`);
    }
  }

  // Date
  let endDate = '';
  if (fields.end_date) {
    const parsed = parseDate(fields.end_date);
    if (parsed) {
      endDate = parsed;
    } else {
      errors.push(`Data limite "${fields.end_date}" inválida. Use dd/MM/yyyy HH:mm ou yyyy-MM-dd`);
    }
  }

  // Options
  const options = fields.options ? parseOptions(fields.options) : [];

  // Validation
  if (!question) errors.push('Campo "Pergunta" é obrigatório');
  if (!category && !fields.category) errors.push('Campo "Categoria" é obrigatório');
  if (!endDate && !fields.end_date) errors.push('Campo "Data limite" é obrigatório');
  if (!resolutionSource) errors.push('Campo "Fonte de resolução" é obrigatório');
  if (!resolutionRules) errors.push('Campo "Regras de resolução" é obrigatório');
  if (options.length < 2) errors.push(`Mínimo de 2 opções. Encontradas: ${options.length}`);

  const uniqueOptions = new Set(options.map(o => o.toLowerCase()));
  if (uniqueOptions.size < options.length) {
    errors.push('Existem opções duplicadas');
  }

  // Warnings
  if (!description) warnings.push('Descrição não fornecida');
  if (!slug) warnings.push('Slug será gerado automaticamente');
  if (tags.length === 0) warnings.push('Nenhuma tag fornecida');

  return {
    draft: {
      question, description, category,
      end_date: endDate,
      resolution_source: resolutionSource,
      resolution_rules: resolutionRules,
      options, slug, tags, thumbnail,
    },
    errors,
    warnings,
  };
}

/* ─── Bulk parsing ─── */

export interface BulkParseResult {
  results: { index: number; result: ParseResult }[];
  totalValid: number;
  totalInvalid: number;
}

/**
 * Splits text by common separators (---, ===, ***) and parses each block independently.
 * Returns per-market results with index for error identification.
 */
export function parseMultipleMarkets(text: string): BulkParseResult {
  // Split by separator lines (3+ dashes, equals, or asterisks, possibly with surrounding whitespace)
  const blocks = text
    .split(/\n\s*(?:-{3,}|={3,}|\*{3,})\s*\n/)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  const results = blocks.map((block, index) => ({
    index: index + 1,
    result: parseMarketText(block),
  }));

  const totalValid = results.filter(r => r.result.errors.length === 0).length;
  const totalInvalid = results.length - totalValid;

  return { results, totalValid, totalInvalid };
}
