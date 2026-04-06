import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { useInfiniteMarkets, SortOption } from '@/hooks/useMarkets';
import { CATEGORIES, MarketCategory } from '@/data/types';
import { cn } from '@/lib/utils';
import { Search, Loader2 } from 'lucide-react';
import { MarketGridSkeleton, ErrorState, EmptyState } from '@/components/futra/Skeletons';

const SORT_OPTIONS: SortOption[] = ['Trending', 'Popular', 'Newest', 'Ending Soon'];

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
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || '';
  const [sortBy, setSortBy] = useState<SortOption>(
    initialFilter === 'trending' ? 'Trending' : initialFilter === 'popular' ? 'Popular' : initialFilter === 'ending' ? 'Ending Soon' : 'Trending'
  );
  const [categoryFilter, setCategoryFilter] = useState<MarketCategory | 'all'>('all');

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteMarkets({
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    sort: sortBy,
  });

  const markets = data?.pages.flat() || [];

  // Intersection observer for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Explorar Mercados</h1>
        <p className="text-muted-foreground mb-6">Explore mercados de previsão em todas as categorias.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setCategoryFilter('all')} className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors', categoryFilter === 'all' ? 'bg-primary/10 text-primary' : 'bg-surface-700 text-muted-foreground')}>Todos</button>
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
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {markets.map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
            </div>

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="flex justify-center py-8">
              {isFetchingNextPage && (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
            </div>
          </>
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
