import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { useMarkets } from '@/hooks/useMarkets';
import { CATEGORIES, MarketCategory } from '@/data/types';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { MarketGridSkeleton, ErrorState, EmptyState } from '@/components/futra/Skeletons';
import { SEO } from '@/components/SEO';
import { useRealtimeMarkets } from '@/hooks/useRealtimeMarket';

const SORT_OPTIONS = ['Trending', 'Popular', 'Newest', 'Ending Soon'];

function dbToCard(m: any) {
  return {
    id: m.id, question: m.question, description: m.description, category: m.category,
    type: m.type, status: m.status, options: m.options, totalParticipants: m.total_participants,
    totalCredits: m.total_credits, endDate: m.end_date, createdAt: m.created_at,
    resolutionSource: m.resolution_source || '', resolutionRules: m.resolution_rules || '',
    featured: m.featured, trending: m.trending,
  };
}

export default function BrowsePage() {
  useRealtimeMarkets();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || '';
  const [sortBy, setSortBy] = useState(initialFilter === 'trending' ? 'Trending' : initialFilter === 'popular' ? 'Popular' : initialFilter === 'ending' ? 'Ending Soon' : 'Trending');
  const [categoryFilter, setCategoryFilter] = useState<MarketCategory | 'all'>('all');

  const { data: allMarkets, isLoading, isError, refetch } = useMarkets(categoryFilter !== 'all' ? { category: categoryFilter } : undefined);

  let markets = allMarkets || [];
  if (sortBy === 'Trending') markets = markets.filter(m => m.trending).concat(markets.filter(m => !m.trending));
  else if (sortBy === 'Popular') markets = [...markets].sort((a, b) => b.total_participants - a.total_participants);
  else if (sortBy === 'Newest') markets = [...markets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  else if (sortBy === 'Ending Soon') markets = [...markets].sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());

  return (
    <Layout>
      <SEO title="Browse Markets" description="Explore all prediction markets on FUTRA" />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Browse Markets</h1>
        <p className="text-muted-foreground mb-6">Explore prediction markets across all categories.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setCategoryFilter('all')} className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors', categoryFilter === 'all' ? 'bg-primary/10 text-primary' : 'bg-surface-700 text-muted-foreground')}>All</button>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setCategoryFilter(cat.key)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors', categoryFilter === cat.key ? 'bg-primary/10 text-primary' : 'bg-surface-700 text-muted-foreground')}>{cat.emoji} {cat.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          {SORT_OPTIONS.map(opt => (
            <button key={opt} onClick={() => setSortBy(opt)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', sortBy === opt ? 'bg-surface-700 text-foreground' : 'text-muted-foreground hover:text-foreground')}>{opt}</button>
          ))}
        </div>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <MarketGridSkeleton count={6} />
        ) : markets.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets.map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
          </div>
        ) : (
          <EmptyState
            icon={<Search className="h-10 w-10 text-muted-foreground" />}
            title="Nenhum mercado encontrado"
            description="Tente mudar os filtros ou explore outra categoria."
          />
        )}
      </div>
    </Layout>
  );
}
