/**
 * Parses structured text into market draft fields.
 * Accepts "Campo:" blocks with flexible formatting.
 */

const CATEGORIES = ['politics', 'economy', 'crypto', 'football', 'culture', 'technology'];

const FIELD_ALIASES: Record<string, string> = {
  'pergunta': 'question',
  'question': 'question',
  'descrição': 'description',
  'descricao': 'description',
  'description': 'description',
  'categoria': 'category',
  'category': 'category',
  'data limite': 'end_date',
  'data': 'end_date',
  'deadline': 'end_date',
  'end date': 'end_date',
  'fonte de resolução': 'resolution_source',
  'fonte de resolucao': 'resolution_source',
  'fonte': 'resolution_source',
  'resolution source': 'resolution_source',
  'regras de resolução': 'resolution_rules',
  'regras de resolucao': 'resolution_rules',
  'regras': 'resolution_rules',
  'resolution rules': 'resolution_rules',
  'opções de resposta': 'options',
  'opcoes de resposta': 'options',
  'opções': 'options',
  'opcoes': 'options',
  'options': 'options',
  'respostas': 'options',
  'slug': 'slug',
  'tags': 'tags',
  'thumbnail': 'thumbnail',
};

export interface MarketDraft {
  question: string;
  description: string;
  category: string;
  end_date: string; // yyyy-MM-ddTHH:mm format
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

function normalizeFieldName(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents for matching
    .replace(/\s+/g, ' ');
  
  // Also try with accents
  const withAccents = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  
  return FIELD_ALIASES[cleaned] || FIELD_ALIASES[withAccents] || null;
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  
  // dd/MM/yyyy HH:mm
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (brMatch) {
    const [, d, m, y, h, min] = brMatch;
    const date = new Date(+y, +m - 1, +d, +h, +min);
    if (!isNaN(date.getTime())) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min}`;
    }
  }
  
  // dd/MM/yyyy
  const brDateOnly = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brDateOnly) {
    const [, d, m, y] = brDateOnly;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00`;
  }
  
  // yyyy-MM-ddTHH:mm (already correct)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 16);
  }
  
  // yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T12:00`;
  }
  
  // Try native Date parse as fallback
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
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
  return raw
    .split('\n')
    .map(line => line.trim())
    .map(line => line.replace(/^[-–—•*]\s*/, '')) // remove bullet chars
    .map(line => line.replace(/^\d+[.)]\s*/, '')) // remove numbering
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

function matchCategory(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase();
  if (CATEGORIES.includes(cleaned)) return cleaned;
  
  // Fuzzy match common PT names
  const map: Record<string, string> = {
    'política': 'politics', 'politica': 'politics',
    'economia': 'economy',
    'futebol': 'football',
    'tecnologia': 'technology',
    'cultura': 'culture',
  };
  return map[cleaned] || null;
}

export function parseMarketText(text: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const fields: Record<string, string> = {};
  
  // Split into "Field:" blocks
  // Match lines that start with a known field pattern
  const lines = text.split('\n');
  let currentField: string | null = null;
  let currentValue: string[] = [];
  
  for (const line of lines) {
    // Check if line starts a new field (word(s) followed by colon)
    const fieldMatch = line.match(/^([^:]{1,40}):\s*(.*)$/);
    if (fieldMatch) {
      const fieldName = normalizeFieldName(fieldMatch[1]);
      if (fieldName) {
        // Save previous field
        if (currentField) {
          fields[currentField] = currentValue.join('\n').trim();
        }
        currentField = fieldName;
        currentValue = fieldMatch[2].trim() ? [fieldMatch[2].trim()] : [];
        continue;
      }
    }
    // Continuation of current field
    if (currentField) {
      currentValue.push(line);
    }
  }
  // Save last field
  if (currentField) {
    fields[currentField] = currentValue.join('\n').trim();
  }
  
  // Build draft
  const question = fields.question?.trim() || '';
  const description = fields.description?.trim() || '';
  const resolutionSource = fields.resolution_source?.trim() || '';
  const resolutionRules = fields.resolution_rules?.trim() || '';
  const slug = fields.slug?.trim() || (question ? generateSlug(question) : '');
  const tags = fields.tags ? fields.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
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
  
  // Check for duplicates
  const uniqueOptions = new Set(options.map(o => o.toLowerCase()));
  if (uniqueOptions.size < options.length) {
    errors.push('Existem opções duplicadas');
  }
  
  // Check for empty options
  if (options.some(o => !o)) {
    errors.push('Existem opções vazias');
  }
  
  // Warnings
  if (!description) warnings.push('Descrição não fornecida');
  if (!slug) warnings.push('Slug será gerado automaticamente');
  if (tags.length === 0) warnings.push('Nenhuma tag fornecida');
  
  return {
    draft: {
      question,
      description,
      category,
      end_date: endDate,
      resolution_source: resolutionSource,
      resolution_rules: resolutionRules,
      options,
      slug,
      tags,
      thumbnail,
    },
    errors,
    warnings,
  };
}
