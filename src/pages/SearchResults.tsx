import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { useSearchMarkets } from '@/hooks/useSearch';
import { Search } from 'lucide-react';
import { MarketGridSkeleton, EmptyState } from '@/components/futra/Skeletons';
import { CATEGORIES } from '@/types';
import { Link } from 'react-router-dom';

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
  const { data: results = [], isLoading } = useSearchMarkets(query);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          {query ? `Results for "${query}"` : 'Search'}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isLoading ? 'Searching...' : `${results.length} markets found`}
        </p>

        {isLoading ? (
          <MarketGridSkeleton count={3} />
        ) : results.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
          </div>
        ) : (
          <div className="space-y-6">
            <EmptyState
              icon={<Search className="h-10 w-10 text-muted-foreground" />}
              title={query ? 'No markets found' : 'Type something to search'}
              description={query ? 'Try different terms or explore available markets.' : 'Use the search bar to find markets.'}
            />
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Popular categories:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {CATEGORIES.map(cat => (
                  <Link key={cat.key} to={`/category/${cat.key}`} className="px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground bg-surface-800">
                    {cat.emoji} {cat.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
