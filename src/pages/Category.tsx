import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MarketCard } from '@/components/futra/MarketCard';
import { getMarketsByCategory } from '@/data/mock-markets';
import { CATEGORIES, MarketCategory } from '@/data/types';

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const cat = CATEGORIES.find(c => c.key === category);
  const markets = getMarketsByCategory(category || '');

  if (!cat) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Category not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <span className="text-4xl">{cat.emoji}</span> {cat.label}
          </h1>
          <p className="text-muted-foreground mt-2">{markets.length} active markets</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map(m => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
        {markets.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No markets in this category yet.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
