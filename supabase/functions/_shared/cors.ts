const ALLOWED_ORIGINS = [
  'https://futra.app',
  'https://www.futra.app',
];

// In development/preview, allow all origins
const isDev = typeof Deno !== 'undefined' && Deno.env.get('ENVIRONMENT') !== 'production';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function getCorsHeaders(origin?: string | null) {
  const allowedOrigin = isDev
    ? (origin || '*')
    : (origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);

  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': allowedOrigin,
  };
}
