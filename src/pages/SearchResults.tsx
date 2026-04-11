import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { useSearchMarkets } from '@/hooks/useSearch';
import { Search } from 'lucide-react';
import { MarketGridSkeleton, EmptyState } from '@/components/futra/Skeletons';
import { CATEGORIES } from '@/types';
import { Link } from 'react-router-dom';
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

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') || '';
  const { data: results = [], isLoading } = useSearchMarkets(query);

  return (
    <Layout>
      <SEO title={query ? `Resultados para "${query}" — FUTRA` : 'Busca — FUTRA'} description="Busque mercados de previsão na FUTRA." />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          {query ? `Resultados para "${query}"` : 'Busca'}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isLoading ? 'Buscando...' : `${results.length} mercado${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''}`}
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
              title={query ? 'Nenhum mercado encontrado' : 'Digite algo para buscar'}
              description={query ? 'Tente termos diferentes ou explore os mercados disponíveis.' : 'Use a barra de busca para encontrar mercados.'}
            />
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Categorias populares:</p>
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
