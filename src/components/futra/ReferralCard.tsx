import { Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function ReferralCard() {
  const { profile } = useAuth();
  if (!profile?.referral_code) return null;

  const referralLink = `${window.location.origin}/?ref=${profile.referral_code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Link de indicação copiado!');
  };

  const shareOnX = () => {
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent('Junte-se a mim na FUTRA — a plataforma social de previsões onde suas apostas constroem reputação!')}&url=${encodeURIComponent(referralLink)}`, '_blank');
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold text-foreground mb-2">Convide amigos, ganhe créditos</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Compartilhe seu link de indicação. Você ganha 200 créditos e seu amigo ganha 100 ao se cadastrar.
      </p>
      <div className="flex gap-2">
        <div className="flex-1 rounded-lg bg-surface-800 px-3 py-2 text-xs text-muted-foreground truncate font-mono">
          {referralLink}
        </div>
        <Button size="icon" variant="outline" onClick={copyLink}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={shareOnX}>
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
