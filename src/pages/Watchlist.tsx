import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/contexts/AuthContext';
import { Bookmark } from 'lucide-react';
import { MarketGridSkeleton, EmptyState } from '@/components/futra/Skeletons';
import { Button } from '@/components/ui/button';
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

export default function WatchlistPage() {
  const { user } = useAuth();
  const { data: markets, isLoading } = useWatchlist();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Watchlist</h1>
        <p className="text-muted-foreground mb-6">Markets you're keeping an eye on.</p>

        {isLoading ? (
          <MarketGridSkeleton count={3} />
        ) : (markets || []).length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets!.map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
          </div>
        ) : (
          <EmptyState
            icon={<Bookmark className="h-10 w-10 text-muted-foreground" />}
            title="No markets watched yet"
            description="Browse markets to find interesting predictions."
            action={<Button variant="outline" asChild><Link to="/browse">Explore markets</Link></Button>}
          />
        )}
      </div>
    </Layout>
  );
}
