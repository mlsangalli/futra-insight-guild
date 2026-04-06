import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { useMarkets } from '@/hooks/useMarkets';
import { Search } from 'lucide-react';
import { MarketGridSkeleton, EmptyState, ErrorState } from '@/components/futra/Skeletons';

function dbToCard(m: any) {
  return {
    id: m.id, question: m.question, description: m.description, category: m.category,
    type: m.type, status: m.status, options: m.options, totalParticipants: m.total_participants,
    totalCredits: m.total_credits, endDate: m.end_date, createdAt: m.created_at,
    resolutionSource: m.resolution_source || '', resolutionRules: m.resolution_rules || '',
    featured: m.featured, trending: m.trending,
  };
}

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') || '';
  const { data: allMarkets, isLoading, isError, refetch } = useMarkets();

  const results = query && allMarkets
    ? allMarkets.filter(m => m.question.toLowerCase().includes(query.toLowerCase())).map(dbToCard)
    : [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          {query ? `Results for "${query}"` : 'Search'}
        </h1>
        <p className="text-muted-foreground mb-6">{isLoading ? 'Searching...' : `${results.length} markets found`}</p>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <MarketGridSkeleton count={3} />
        ) : results.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(m => <MarketCard key={m.id} market={m} />)}
          </div>
        ) : (
          <EmptyState
            icon={<Search className="h-10 w-10 text-muted-foreground" />}
            title={query ? 'No markets found' : 'Type something to search'}
            description={query ? 'Try different terms or explore available markets.' : 'Use the search bar to find markets.'}
          />
        )}
      </div>
    </Layout>
  );
}
