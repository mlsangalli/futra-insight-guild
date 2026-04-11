import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { useMarkets } from '@/hooks/useMarkets';
import { CATEGORIES } from '@/types';
import { FolderOpen } from 'lucide-react';
import { MarketGridSkeleton, ErrorState, EmptyState } from '@/components/futra/Skeletons';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { SEO } from '@/components/SEO';

function dbToCard(m: any) {
  return {
    id: m.id, question: m.question, description: m.description, category: m.category,
    type: m.type, status: m.status, options: m.options, totalParticipants: m.total_participants,
    totalCredits: m.total_credits, endDate: m.end_date, createdAt: m.created_at,
    resolutionSource: m.resolution_source || '', resolutionRules: m.resolution_rules || '',
    featured: m.featured, trending: m.trending, imageUrl: m.image_url || '',
  };
}

const PAGE_SIZE = 20;

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const cat = CATEGORIES.find(c => c.key === category);
  const { data: markets, isLoading, isError, refetch } = useMarkets({ category });
  const [page, setPage] = useState(0);

  const allMarkets = markets || [];
  const paginatedMarkets = allMarkets.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = paginatedMarkets.length < allMarkets.length;

  return (
    <Layout>
      <SEO title={`${cat?.label || category} — Mercados`} description={`Mercados de previsão na categoria ${cat?.label || category}. Faça suas previsões e construa reputação.`} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          {cat && <span className="text-4xl">{cat.emoji}</span>}
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">{cat?.label || category}</h1>
            <p className="text-muted-foreground">Todos os mercados nesta categoria</p>
          </div>
        </div>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <MarketGridSkeleton count={6} />
        ) : paginatedMarkets.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedMarkets.map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <Button variant="outline" onClick={() => setPage(p => p + 1)}>
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={<FolderOpen className="h-10 w-10 text-muted-foreground" />}
            title="Nenhum mercado nesta categoria"
            description="Novos mercados aparecerão aqui quando forem criados."
          />
        )}
      </div>
    </Layout>
  );
}
