import { Link } from 'react-router-dom';
import { Trophy, RefreshCw, Coins, Zap, Share2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';

interface FlowSummaryProps {
  answered: number;
  skipped: number;
  invested: number;
  onRestart: () => void;
}

export function FlowSummary({ answered, skipped, invested, onRestart }: FlowSummaryProps) {
  const handleShare = async () => {
    const text = `Acabei de responder ${answered} mercados na FUTRA e investi ${invested} FC. Tente também: https://futra.com.br/flow`;
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: 'FUTRA Flow', text, url: 'https://futra.com.br/flow' });
        return;
      } catch {
        /* ignore */
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-12 text-center">
      <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-accent/30">
        <Trophy className="h-10 w-10 text-primary" />
      </div>
      <h1 className="mb-2 font-display text-3xl font-bold">Sessão completa</h1>
      <p className="mb-8 text-muted-foreground">Você está em dia com o feed. Volte mais tarde para mercados novos.</p>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/40 bg-surface-800 p-4">
          <Zap className="mx-auto mb-1 h-4 w-4 text-primary" />
          <div className="font-display text-2xl font-bold">{answered}</div>
          <div className="text-xs text-muted-foreground">Respostas</div>
        </div>
        <div className="rounded-lg border border-border/40 bg-surface-800 p-4">
          <Coins className="mx-auto mb-1 h-4 w-4 text-warning" />
          <div className="font-display text-2xl font-bold">{invested.toLocaleString('pt-BR')}</div>
          <div className="text-xs text-muted-foreground">FC investidos</div>
        </div>
        <div className="rounded-lg border border-border/40 bg-surface-800 p-4">
          <RefreshCw className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
          <div className="font-display text-2xl font-bold">{skipped}</div>
          <div className="text-xs text-muted-foreground">Pulados</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={onRestart} size="lg" className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" /> Buscar mais mercados
        </Button>
        <Button onClick={handleShare} variant="outline" size="lg" className="w-full">
          <Share2 className="mr-2 h-4 w-4" /> Compartilhar sessão
        </Button>
        <Button asChild variant="ghost" size="lg" className="w-full">
          <Link to="/dashboard">Ver meu perfil</Link>
        </Button>
      </div>
    </div>
  );
}
