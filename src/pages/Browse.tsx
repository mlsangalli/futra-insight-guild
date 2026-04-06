import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { useMarkets } from '@/hooks/useMarkets';
import { CATEGORIES, MarketCategory } from '@/data/types';
import { cn } from '@/lib/utils';
import { Search, X, ChevronDown } from 'lucide-react';
import { MarketGridSkeleton, ErrorState, EmptyState } from '@/components/futra/Skeletons';
import { SEO } from '@/components/SEO';
import { useRealtimeMarkets } from '@/hooks/useRealtimeMarket';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'ending', label: 'Ending Soon' },
];

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
  const [sortBy, setSortBy] = useState(
    initialFilter === 'trending' ? 'trending' :
    initialFilter === 'popular' ? 'popular' :
    initialFilter === 'ending' ? 'ending' : 'trending'
  );
  const [categoryFilter, setCategoryFilter] = useState<MarketCategory | 'all'>('all');

  const { data: allMarkets, isLoading, isError, refetch } = useMarkets(categoryFilter !== 'all' ? { category: categoryFilter } : undefined);

  const markets = useMemo(() => {
    let result = allMarkets || [];
    if (sortBy === 'trending') result = result.filter(m => m.trending).concat(result.filter(m => !m.trending));
    else if (sortBy === 'popular') result = [...result].sort((a, b) => b.total_participants - a.total_participants);
    else if (sortBy === 'newest') result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortBy === 'ending') result = [...result].sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
    return result;
  }, [allMarkets, sortBy]);

  const activeCat = CATEGORIES.find(c => c.key === categoryFilter);

  return (
    <Layout>
      <SEO title="Browse Markets" description="Explore all prediction markets on FUTRA" />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Browse Markets</h1>
        <p className="text-muted-foreground mb-6">Explore prediction markets across all categories.</p>

        {/* Sticky filter bar */}
        <div className="sticky top-[56px] lg:top-[64px] z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border/50 mb-4">
          <div className="flex items-center gap-3">
            {/* Category pills - scrollable */}
            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 snap-x snap-mandatory">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0 snap-start',
                    categoryFilter === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-800 text-muted-foreground hover:bg-surface-700'
                  )}
                >
                  All
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setCategoryFilter(cat.key)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0 snap-start',
                      categoryFilter === cat.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface-800 text-muted-foreground hover:bg-surface-700'
                    )}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort dropdown */}
            <div className="shrink-0">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] h-8 text-xs bg-surface-800 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter chip */}
          {categoryFilter !== 'all' && activeCat && (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                {activeCat.emoji} {activeCat.label}
                <button onClick={() => setCategoryFilter('all')} className="ml-0.5 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Results counter */}
        {!isLoading && !isError && (
          <p className="text-sm text-muted-foreground mb-4">
            Showing {markets.length} {markets.length === 1 ? 'market' : 'markets'}
          </p>
        )}

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
            title="No markets found"
            description="Try changing the filters or explore another category."
          />
        )}
      </div>
    </Layout>
  );
}
