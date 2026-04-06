/**
 * Structured API error handling for FUTRA
 */

export class ApiError extends Error {
  code: string;
  status: number;
  context?: Record<string, unknown>;

  constructor(message: string, code: string, status: number, context?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.context = context;
  }
}

const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  '23505': 'Este registro já existe.',
  '23503': 'Referência inválida — o item vinculado não existe.',
  '42501': 'Você não tem permissão para esta ação.',
  '42P01': 'O recurso solicitado não foi encontrado.',
  'PGRST301': 'Você precisa estar logado para realizar esta ação.',
  'PGRST116': 'O registro solicitado não foi encontrado.',
  '23514': 'Os dados fornecidos não atendem aos requisitos.',
  '57014': 'A consulta demorou demais. Tente novamente.',
};

interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export function handleSupabaseError(error: SupabaseError): ApiError {
  const code = error.code || 'UNKNOWN';
  const userMessage = USER_FRIENDLY_MESSAGES[code] || error.message || 'Ocorreu um erro inesperado.';
  const status = code.startsWith('PGRST') ? 400 : 500;

  return new ApiError(userMessage, code, status, {
    originalMessage: error.message,
    details: error.details,
    hint: error.hint,
  });
}

/** Extrai mensagem legível de erros do Supabase/genéricos */
export function parseSupabaseError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    const code = e.code as string | undefined;
    if (code && USER_FRIENDLY_MESSAGES[code]) return USER_FRIENDLY_MESSAGES[code];
    if (typeof e.message === 'string' && e.message.includes('rate limit'))
      return 'Muitas requisições. Aguarde alguns segundos.';
    if (typeof e.message === 'string') return e.message;
  }
  if (typeof error === 'string') return error;
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
