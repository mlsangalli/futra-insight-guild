import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { useMarkets } from '@/hooks/useMarkets';
import { CATEGORIES } from '@/types';
import { FolderOpen } from 'lucide-react';
import { MarketGridSkeleton, ErrorState, EmptyState } from '@/components/futra/Skeletons';

function dbToCard(m: any) {
  return {
    id: m.id, question: m.question, description: m.description, category: m.category,
    type: m.type, status: m.status, options: m.options, totalParticipants: m.total_participants,
    totalCredits: m.total_credits, endDate: m.end_date, createdAt: m.created_at,
    resolutionSource: m.resolution_source || '', resolutionRules: m.resolution_rules || '',
    featured: m.featured, trending: m.trending,
  };
}

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const cat = CATEGORIES.find(c => c.key === category);
  const { data: markets, isLoading, isError, refetch } = useMarkets({ category });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          {cat && <span className="text-4xl">{cat.emoji}</span>}
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">{cat?.label || category}</h1>
            <p className="text-muted-foreground">All markets in this category</p>
          </div>
        </div>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <MarketGridSkeleton count={6} />
        ) : (markets || []).length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(markets || []).map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
          </div>
        ) : (
          <EmptyState
            icon={<FolderOpen className="h-10 w-10 text-muted-foreground" />}
            title="No markets in this category"
            description="New markets will appear here when they are created."
          />
        )}
      </div>
    </Layout>
  );
}
