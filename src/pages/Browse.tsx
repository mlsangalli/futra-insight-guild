import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { useBrowseSorted } from '@/hooks/useMarkets';
import { CATEGORIES, MarketCategory } from '@/types';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import { MarketGridSkeleton, ErrorState, EmptyState } from '@/components/futra/Skeletons';
import { SEO } from '@/components/SEO';
import { useRealtimeMarkets } from '@/hooks/useRealtimeMarket';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SORT_OPTIONS = [
  { value: 'trending', label: 'Em alta' },
  { value: 'popular', label: 'Populares' },
  { value: 'newest', label: 'Mais recentes' },
  { value: 'ending', label: 'Encerrando' },
];

function dbToCard(m: any) {
  return {
    id: m.id, question: m.question, description: m.description, category: m.category,
    type: m.type, status: m.status, options: m.options, totalParticipants: m.total_participants,
    totalCredits: m.total_credits, endDate: m.end_date, createdAt: m.created_at,
    resolutionSource: m.resolution_source || '', resolutionRules: m.resolution_rules || '',
    featured: m.featured, trending: m.trending, imageUrl: m.image_url || '',
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
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useBrowseSorted({
    sort: sortBy,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    page,
  });

  const markets = data?.data ?? [];
  const totalCount = data?.totalCount ?? 0;
  const pageSize = 20;
  const hasMore = (page + 1) * pageSize < totalCount;

  const activeCat = CATEGORIES.find(c => c.key === categoryFilter);

  return (
    <Layout>
      <SEO title="Explorar Mercados" description="Explore todos os mercados de previsão na FUTRA" />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Explorar Mercados</h1>
        <p className="text-muted-foreground mb-6">Explore mercados de previsão em todas as categorias.</p>

        {/* Sticky filter bar */}
        <div className="sticky top-[56px] lg:top-[64px] z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border/50 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 snap-x snap-mandatory">
                <button
                  onClick={() => { setCategoryFilter('all'); setPage(0); }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0 snap-start',
                    categoryFilter === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-800 text-muted-foreground hover:bg-surface-700'
                  )}
                >
                  Todos
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => { setCategoryFilter(cat.key); setPage(0); }}
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

            <div className="shrink-0">
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(0); }}>
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

          {categoryFilter !== 'all' && activeCat && (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                {activeCat.emoji} {activeCat.label}
                <button onClick={() => { setCategoryFilter('all'); setPage(0); }} className="ml-0.5 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          )}
        </div>

        {!isLoading && !isError && (
          <p className="text-sm text-muted-foreground mb-4">
            Mostrando {markets.length} de {totalCount} {totalCount === 1 ? 'mercado' : 'mercados'}
          </p>
        )}

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <MarketGridSkeleton count={6} />
        ) : markets.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {markets.map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
            </div>
            <div className="flex items-center justify-center gap-3 mt-8">
              {page > 0 && (
                <Button variant="outline" onClick={() => setPage(p => p - 1)}>
                  Anterior
                </Button>
              )}
              {hasMore && (
                <Button variant="outline" onClick={() => setPage(p => p + 1)}>
                  Próxima página
                </Button>
              )}
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Search className="h-10 w-10 text-muted-foreground" />}
            title="Nenhum mercado encontrado"
            description="Tente mudar os filtros ou explorar outra categoria."
          />
        )}
      </div>
    </Layout>
  );
}
