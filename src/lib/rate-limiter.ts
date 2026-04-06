/**
 * Client-side rate limiter using localStorage
 */
interface RateLimitRecord {
  timestamps: number[];
}

const STORAGE_KEY = 'futra_rate_limits';

function getRecords(): Record<string, RateLimitRecord> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveRecords(records: Record<string, RateLimitRecord>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function canPerform(action: string, maxPerWindow: number, windowMs: number): boolean {
  const records = getRecords();
  const now = Date.now();
  const record = records[action] || { timestamps: [] };
  record.timestamps = record.timestamps.filter(t => t > now - windowMs);
  return record.timestamps.length < maxPerWindow;
}

export function recordAction(action: string, windowMs: number) {
  const records = getRecords();
  const now = Date.now();
  const record = records[action] || { timestamps: [] };
  record.timestamps = record.timestamps.filter(t => t > now - windowMs);
  record.timestamps.push(now);
  records[action] = record;
  saveRecords(records);
}

export function getRemainingTime(action: string, windowMs: number): number {
  const records = getRecords();
  const now = Date.now();
  const record = records[action] || { timestamps: [] };
  if (record.timestamps.length === 0) return 0;
  const oldest = Math.min(...record.timestamps.filter(t => t > now - windowMs));
  return Math.max(0, oldest + windowMs - now);
}

// Preset limits
export const RATE_LIMITS = {
  prediction: { max: 30, windowMs: 60 * 60 * 1000 },
  comment: { max: 20, windowMs: 60 * 60 * 1000 },
  daily_bonus: { max: 1, windowMs: 24 * 60 * 60 * 1000 },
  search: { max: 60, windowMs: 60 * 1000 },
} as const;
