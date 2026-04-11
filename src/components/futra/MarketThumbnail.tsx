import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { MarketCategory } from '@/types';

const CATEGORY_FALLBACKS: Record<MarketCategory, { icon: string; gradient: string }> = {
  politics: { icon: '🏛️', gradient: 'from-indigo-900/60 to-indigo-800/30' },
  economy: { icon: '📊', gradient: 'from-emerald-900/60 to-emerald-800/30' },
  crypto: { icon: '₿', gradient: 'from-amber-900/60 to-amber-800/30' },
  football: { icon: '⚽', gradient: 'from-green-900/60 to-green-800/30' },
  culture: { icon: '🎬', gradient: 'from-purple-900/60 to-purple-800/30' },
  technology: { icon: '🤖', gradient: 'from-cyan-900/60 to-cyan-800/30' },
};

interface MarketThumbnailProps {
  imageUrl?: string;
  category: MarketCategory;
  alt?: string;
  className?: string;
  size?: 'card' | 'detail';
}

export function MarketThumbnail({ imageUrl, category, alt = '', className, size = 'card' }: MarketThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const fallback = CATEGORY_FALLBACKS[category] || CATEGORY_FALLBACKS.technology;
  const hasImage = !!imageUrl && !error;

  return (
    <div className={cn(
      'relative overflow-hidden bg-surface-800',
      size === 'card' ? 'aspect-[16/9] rounded-t-xl' : 'aspect-[21/9] rounded-xl',
      className,
    )}>
      {hasImage ? (
        <img
          src={imageUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}

      {/* Fallback or loading state */}
      {(!hasImage || !loaded) && (
        <div className={cn(
          'absolute inset-0 flex items-center justify-center bg-gradient-to-br',
          fallback.gradient,
        )}>
          <span className={cn(
            'select-none opacity-40',
            size === 'card' ? 'text-4xl' : 'text-6xl',
          )}>
            {fallback.icon}
          </span>
        </div>
      )}
    </div>
  );
}
