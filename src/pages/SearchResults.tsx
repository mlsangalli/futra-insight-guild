import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { mockMarkets } from '@/data/mock-markets';
import { Search } from 'lucide-react';

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') || '';

  const results = query
    ? mockMarkets.filter(m => m.question.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          {query ? `Results for "${query}"` : 'Search'}
        </h1>
        <p className="text-muted-foreground mb-6">{results.length} markets found</p>

        {results.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(m => <MarketCard key={m.id} market={m} />)}
          </div>
        ) : (
          <div className="text-center py-20">
            <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {query ? 'No markets match your search.' : 'Type something to search.'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
