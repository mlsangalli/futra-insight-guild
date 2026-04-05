import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Lock } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES } from '@/data/types';

export default function CreateMarketPage() {
  const [hasAccess] = useState(false); // Mock: user doesn't have required reputation

  if (!hasAccess) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-surface-700 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Create a market</h1>
          <p className="text-muted-foreground mt-3">
            You need <span className="text-primary font-medium">High Influence</span> or above to create markets. Keep making accurate predictions to level up!
          </p>
          <div className="mt-6 rounded-lg bg-surface-800 p-4">
            <p className="text-sm text-muted-foreground">Your current level: <span className="text-foreground font-medium">Low Influence</span></p>
            <p className="text-sm text-muted-foreground mt-1">Required: <span className="text-emerald font-medium">High Influence</span></p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-6">Create a market</h1>
        <div className="space-y-6 rounded-xl border border-border bg-card p-6">
          <div>
            <label className="text-sm font-medium text-foreground">Question</label>
            <Input placeholder="Will X happen by Y date?" className="mt-1 bg-surface-800" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Category</label>
            <select className="w-full mt-1 rounded-lg bg-surface-800 border border-border p-2.5 text-sm text-foreground">
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">End date</label>
            <Input type="date" className="mt-1 bg-surface-800" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Resolution source</label>
            <Input placeholder="e.g., Official government data" className="mt-1 bg-surface-800" />
          </div>
          <Button className="w-full gradient-primary border-0">Submit for review</Button>
        </div>
      </div>
    </Layout>
  );
}
