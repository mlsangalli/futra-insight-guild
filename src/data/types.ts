export type MarketCategory = 'politics' | 'economy' | 'crypto' | 'football' | 'culture' | 'technology';

export type MarketType = 'binary' | 'multiple';

export type MarketStatus = 'open' | 'closed' | 'resolved';

export type InfluenceLevel = 'low' | 'medium' | 'high' | 'elite';

export interface MarketOption {
  id: string;
  label: string;
  votes: number;
  creditsAllocated: number;
  percentage: number;
}

export interface Market {
  id: string;
  question: string;
  description: string;
  category: MarketCategory;
  type: MarketType;
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

export interface UserBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

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

export interface Prediction {
  id: string;
  marketId: string;
  userId: string;
  optionId: string;
  creditsAllocated: number;
  potentialReward: number;
  status: 'pending' | 'won' | 'lost';
  createdAt: string;
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

export const CATEGORIES: { key: MarketCategory; label: string; emoji: string }[] = [
  { key: 'politics', label: 'Politics', emoji: '🏛️' },
  { key: 'economy', label: 'Economy', emoji: '📊' },
  { key: 'crypto', label: 'Crypto', emoji: '₿' },
  { key: 'football', label: 'Football', emoji: '⚽' },
  { key: 'culture', label: 'Culture', emoji: '🎬' },
  { key: 'technology', label: 'Technology', emoji: '🤖' },
];

export const INFLUENCE_LABELS: Record<InfluenceLevel, string> = {
  low: 'Low Influence',
  medium: 'Medium Influence',
  high: 'High Influence',
  elite: 'Elite',
};

export const INFLUENCE_COLORS: Record<InfluenceLevel, string> = {
  low: 'text-muted-foreground',
  medium: 'text-neon-blue',
  high: 'text-emerald',
  elite: 'gradient-primary-text',
};
