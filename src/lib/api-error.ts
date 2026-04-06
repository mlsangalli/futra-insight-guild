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
  '23505': 'This record already exists.',
  '23503': 'Referenced record not found.',
  '42501': 'You do not have permission to perform this action.',
  '42P01': 'The requested resource was not found.',
  'PGRST301': 'You must be logged in to perform this action.',
  'PGRST116': 'The requested record was not found.',
  '23514': 'The data provided does not meet the requirements.',
};

interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export function handleSupabaseError(error: SupabaseError): ApiError {
  const code = error.code || 'UNKNOWN';
  const userMessage = USER_FRIENDLY_MESSAGES[code] || error.message || 'An unexpected error occurred.';
  const status = code.startsWith('PGRST') ? 400 : 500;

  return new ApiError(userMessage, code, status, {
    originalMessage: error.message,
    details: error.details,
    hint: error.hint,
  });
}
