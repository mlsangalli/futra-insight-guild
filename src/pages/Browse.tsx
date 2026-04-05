import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { mockMarkets } from '@/data/mock-markets';
import { CATEGORIES, MarketCategory } from '@/data/types';
import { cn } from '@/lib/utils';

const SORT_OPTIONS = ['Popular', 'New', 'Ending Soon', 'Most Credits'];

export default function BrowsePage() {
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter');
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState(filter === 'ending' ? 'Ending Soon' : 'Popular');

  let markets = [...mockMarkets];
  if (selectedCategory !== 'all') {
    markets = markets.filter(m => m.category === selectedCategory);
  }
  if (filter === 'trending') markets = markets.filter(m => m.trending);

  if (sortBy === 'Popular') markets.sort((a, b) => b.totalParticipants - a.totalParticipants);
  else if (sortBy === 'New') markets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  else if (sortBy === 'Ending Soon') markets.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  else if (sortBy === 'Most Credits') markets.sort((a, b) => b.totalCredits - a.totalCredits);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-6">Browse markets</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              selectedCategory === 'all' ? 'bg-primary/10 text-primary' : 'bg-surface-700 text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                selectedCategory === cat.key ? 'bg-primary/10 text-primary' : 'bg-surface-700 text-muted-foreground hover:text-foreground'
              )}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-8">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                sortBy === opt ? 'bg-surface-700 text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map(m => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>

        {markets.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No markets found.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
