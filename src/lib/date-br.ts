/**
 * Timezone-aware date helpers locked to America/Sao_Paulo.
 *
 * O frontend e o backend (Supabase) precisam concordar sobre o que é "hoje" e
 * "esta semana" sob a perspectiva do usuário brasileiro — caso contrário o
 * bônus diário e o reset semanal de missões podem oscilar 3h.
 */

const BR_TZ = 'America/Sao_Paulo';
const dateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: BR_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Returns a YYYY-MM-DD key in Brazil time (e.g. "2026-04-22"). */
export function getBrazilDayKey(date: Date = new Date()): string {
  return dateFmt.format(date);
}

/** Returns the YYYY-MM-DD of the Monday-anchored week containing `date`. */
export function getBrazilWeekStartKey(date: Date = new Date()): string {
  const todayKey = getBrazilDayKey(date);
  // Build a UTC-noon Date from the BR day key so that day-of-week math is stable.
  const [y, m, d] = todayKey.split('-').map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dow = anchor.getUTCDay(); // 0 = Sun
  const offset = dow === 0 ? 6 : dow - 1; // Monday = 0
  anchor.setUTCDate(anchor.getUTCDate() - offset);
  const yy = anchor.getUTCFullYear();
  const mm = String(anchor.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(anchor.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** True if `iso` (server timestamp, usually UTC) falls on the same BR day as `ref`. */
export function isSameBrazilDay(iso: string | null | undefined, ref: Date = new Date()): boolean {
  if (!iso) return false;
  return getBrazilDayKey(new Date(iso)) === getBrazilDayKey(ref);
}
