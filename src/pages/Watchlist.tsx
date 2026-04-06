import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { mockMarkets } from '@/data/mock-markets';
import { Bookmark } from 'lucide-react';
import type { MarketCardData } from '@/types';

export default function WatchlistPage() {
  const watchlist = mockMarkets.slice(0, 3); // Mock saved markets

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Watchlist</h1>
        <p className="text-muted-foreground mb-6">Markets you're keeping an eye on.</p>

        {watchlist.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.map(m => <MarketCard key={m.id} market={m} />)}
          </div>
        ) : (
          <div className="text-center py-20">
            <Bookmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No saved markets yet.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
