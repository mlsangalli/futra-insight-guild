/**
 * Centralized type definitions for FUTRA
 * Single source of truth — derived from Supabase schema types
 */
import type { Tables, Enums } from '@/integrations/supabase/types';

// ── Enums (re-export from generated types) ──────────────────────
export type MarketCategory = Enums<'market_category'>;
export type MarketStatus = Enums<'market_status'>;
export type MarketType = 'binary' | 'multiple';
export type InfluenceLevel = Enums<'influence_level'>;
export type PredictionStatus = Enums<'prediction_status'>;
export type AppRole = Enums<'app_role'>;

// ── Domain models ───────────────────────────────────────────────

/** Normalized market option (from market_options table) */
export interface MarketOption {
  id: string;
  label: string;
  votes: number;
  creditsAllocated: number;
  percentage: number;
}

/** Market as returned by our hooks (DB row + parsed options) */
export interface Market {
  id: string;
  question: string;
  description: string;
  category: MarketCategory;
  type: string;
  status: MarketStatus;
  options: MarketOption[];
  total_participants: number;
  total_credits: number;
  end_date: string;
  created_at: string;
  resolution_source: string | null;
  resolution_rules: string | null;
  featured: boolean;
  trending: boolean;
  created_by: string | null;
  lock_date: string | null;
  resolved_option: string | null;
}

/** User profile from profiles table */
export interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  futra_credits: number;
  futra_score: number;
  influence_level: InfluenceLevel;
  total_predictions: number;
  resolved_predictions: number;
  accuracy_rate: number;
  global_rank: number;
  specialties: string[] | null;
  streak: number;
  onboarding_completed: boolean | null;
  last_daily_bonus: string | null;
  referral_code: string | null;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Prediction row */
export interface Prediction {
  id: string;
  user_id: string;
  market_id: string;
  selected_option: string;
  credits_allocated: number;
  status: PredictionStatus;
  reward: number | null;
  created_at: string;
  updated_at: string;
}

/** Admin log row */
export interface AdminLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  action: string;
  marketId: string;
  marketQuestion: string;
  optionLabel: string;
  credits: number;
  timestamp: string;
}

export interface Notification {
  id: string;
  type: 'result' | 'credits' | 'ranking' | 'badge' | 'market';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
}

// ── Legacy-compatible re-exports ────────────────────────────────

/**
 * @deprecated Use `Profile` em vez deste tipo. Será removido em versão futura.
 * Mantido apenas para compatibilidade com componentes legados.
 */
export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  futraCredits: number;
  futraScore: number;
  influenceLevel: InfluenceLevel;
  totalPredictions: number;
  resolvedPredictions: number;
  accuracyRate: number;
  globalRank: number;
  badges: UserBadge[];
  specialties: MarketCategory[];
  streak: number;
  joinedAt: string;
}

export interface UserBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

/**
 * @deprecated Use `Market` em vez deste tipo. Será removido em versão futura.
 * Mantido apenas para compatibilidade com componentes legados.
 */
export interface MarketCardData {
  id: string;
  question: string;
  description: string;
  category: MarketCategory;
  type: string;
  status: MarketStatus;
  options: MarketOption[];
  totalParticipants: number;
  totalCredits: number;
  endDate: string;
  createdAt: string;
  resolutionSource: string;
  resolutionRules: string;
  featured?: boolean;
  trending?: boolean;
  imageUrl?: string;
}

/** Converte Profile (snake_case do DB) para User (camelCase legado) */
export function profileToUser(p: Profile): User {
  return {
    id: p.id,
    username: p.username,
    displayName: p.display_name,
    avatar: p.avatar_url ?? '',
    bio: p.bio ?? '',
    futraCredits: p.futra_credits,
    futraScore: p.futra_score,
    influenceLevel: p.influence_level,
    totalPredictions: p.total_predictions,
    resolvedPredictions: p.resolved_predictions,
    accuracyRate: p.accuracy_rate,
    globalRank: p.global_rank,
    badges: [],
    specialties: p.specialties ? (p.specialties as unknown as MarketCategory[]) : [],
    streak: p.streak,
    joinedAt: p.created_at,
  };
}

// ── Constants ───────────────────────────────────────────────────

export const CATEGORIES: { key: MarketCategory; label: string; emoji: string }[] = [
  { key: 'politics', label: 'Política', emoji: '🏛️' },
  { key: 'economy', label: 'Economia', emoji: '📊' },
  { key: 'crypto', label: 'Cripto', emoji: '₿' },
  { key: 'football', label: 'Futebol', emoji: '⚽' },
  { key: 'culture', label: 'Cultura', emoji: '🎬' },
  { key: 'technology', label: 'Tecnologia', emoji: '🤖' },
];

export const INFLUENCE_LABELS: Record<InfluenceLevel, string> = {
  low: 'Baixa Influência',
  medium: 'Média Influência',
  high: 'Alta Influência',
  elite: 'Elite',
};

export const INFLUENCE_THRESHOLDS: Record<InfluenceLevel, { min: number; max: number | null; nextLabel: string | null }> = {
  low: { min: 0, max: 499, nextLabel: 'Média Influência' },
  medium: { min: 500, max: 1999, nextLabel: 'Alta Influência' },
  high: { min: 2000, max: 4999, nextLabel: 'Elite' },
  elite: { min: 5000, max: null, nextLabel: null },
};

export const INFLUENCE_ORDER: InfluenceLevel[] = ['low', 'medium', 'high', 'elite'];

export const INFLUENCE_COLORS: Record<InfluenceLevel, string> = {
  low: 'text-muted-foreground',
  medium: 'text-neon-blue',
  high: 'text-emerald',
  elite: 'gradient-primary-text',
};
  low: 'text-muted-foreground',
  medium: 'text-neon-blue',
  high: 'text-emerald',
  elite: 'gradient-primary-text',
};
