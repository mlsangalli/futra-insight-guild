import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { useMarkets } from '@/hooks/useMarkets';
import { CATEGORIES } from '@/data/types';
import { Loader2 } from 'lucide-react';

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
  const { data: markets, isLoading } = useMarkets({ category });

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
        {isLoading ? (
          <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(markets || []).map(m => <MarketCard key={m.id} market={dbToCard(m)} />)}
          </div>
        )}
        {!isLoading && (!markets || markets.length === 0) && (
          <div className="text-center py-20"><p className="text-muted-foreground">No markets in this category yet.</p></div>
        )}
      </div>
    </Layout>
  );
}
