import { Layout } from '@/components/layout/Layout';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Target, Coins, TrendingUp, Trophy, Shield, Star, ArrowRight } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
          How FUTRA works
        </h1>
        <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
          A social forecasting platform where accuracy builds reputation. No real money. Just intelligence, conviction, and status.
        </p>

        {/* Steps */}
        <div className="space-y-8">
          {[
            { icon: Target, title: '1. Choose a market', desc: 'Browse open questions about politics, economy, crypto, football, culture, and technology. Pick one that interests you.' },
            { icon: Coins, title: '2. Make your pick & allocate credits', desc: 'Choose Yes/No or your favorite option. Then allocate Futra Credits to back your prediction. More credits = more conviction = bigger potential reward.' },
            { icon: TrendingUp, title: '3. Earn rewards when you\'re right', desc: 'If your prediction is correct, you earn Futra Credits. The less popular your correct choice was, the more you earn. This rewards genuine insight over herd mentality.' },
            { icon: Trophy, title: '4. Build your Futra Score', desc: 'Every prediction affects your Futra Score. Consistent accuracy over time builds your reputation and unlocks higher influence levels.' },
          ].map((step, i) => (
            <div key={i} className="flex gap-5 items-start">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <step.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground text-lg">{step.title}</h3>
                <p className="text-muted-foreground mt-1">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Influence levels */}
        <div className="mt-16">
          <h2 className="font-display text-2xl font-bold text-foreground text-center mb-8">Influence levels</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { level: 'Low', desc: 'New accounts. Limited features.', color: 'border-muted' },
              { level: 'Medium', desc: 'Active forecasters with growing track record.', color: 'border-primary/30' },
              { level: 'High', desc: 'Top performers. Can create markets.', color: 'border-emerald/30' },
              { level: 'Elite', desc: 'Top 1%. Maximum privileges.', color: 'border-primary' },
            ].map(l => (
              <div key={l.level} className={`rounded-xl border ${l.color} bg-card p-4 text-center`}>
                <p className="font-display font-bold text-foreground">{l.level}</p>
                <p className="text-xs text-muted-foreground mt-1">{l.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Anti-trolling */}
        <div className="mt-16 rounded-xl border border-border bg-card p-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Integrity system
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>• Every prediction costs credits — no free trolling</li>
            <li>• New accounts start with limited influence</li>
            <li>• Poor performance reduces influence over time</li>
            <li>• Public prediction history ensures accountability</li>
            <li>• Clear resolution rules and official sources for every market</li>
            <li>• Market creation requires minimum reputation</li>
          </ul>
        </div>

        <div className="text-center mt-12">
          <Button size="lg" className="gradient-primary border-0" asChild>
            <Link to="/browse">Start predicting <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
