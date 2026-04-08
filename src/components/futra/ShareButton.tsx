import { Share2, Link2, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useTrackMission } from '@/hooks/useMissions';
import { trackEvent } from '@/lib/analytics';

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
  /** Optional label override for button (default: icon only) */
  label?: string;
  /** Optional size variant */
  size?: 'icon' | 'sm';
  /** Optional OG image URL for native share */
  ogImageUrl?: string;
  /** Platform to track in analytics */
  shareContext?: 'market' | 'win' | 'profile' | 'result';
}

export function ShareButton({ title, text, url, label, size = 'icon', ogImageUrl, shareContext }: ShareButtonProps) {
  const trackMission = useTrackMission();

  const trackShare = (platform: string) => {
    trackMission.mutate({ actionType: 'share' });
    trackEvent({ event: 'share_clicked', properties: { platform, context: shareContext || 'unknown', url } });
  };

  // Try native Web Share API first on mobile
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        trackShare('native');
        return true;
      } catch {
        // User cancelled — not an error
        return true;
      }
    }
    return false;
  };

  const shareToTwitter = () => {
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
    trackShare('twitter');
  };

  const shareToTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      '_blank'
    );
    trackShare('telegram');
  };

  const shareToWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`,
      '_blank'
    );
    trackShare('whatsapp');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
    trackShare('copy');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {label ? (
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={async (e) => {
              e.stopPropagation();
              // On mobile with label, try native share first
              if (await handleNativeShare()) {
                e.preventDefault();
              }
            }}
          >
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            {label}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={async (e) => {
              e.stopPropagation();
              if (await handleNativeShare()) {
                e.preventDefault();
              }
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={shareToTwitter}>
          <span className="mr-2 font-bold text-xs">𝕏</span> Postar no X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToTelegram}>
          <MessageCircle className="h-4 w-4 mr-2" /> Telegram
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyLink}>
          <Link2 className="h-4 w-4 mr-2" /> Copiar link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Share text generators ─────────────────────────────────────
// Analytical, concise microcopy — no hype, no emojis overload

export function marketShareText(question: string, leaderLabel: string, leaderPct: number): string {
  return `"${question}"\n\n${leaderPct}% dizem ${leaderLabel}\n\nVeja e vote:`;
}

export function winShareText(question: string, won: boolean, reward: number, accuracy: number): string {
  if (won) {
    return `Acertei "${question}" → +${reward} FC\n\nPrecisão: ${accuracy}%\nVeja o mercado:`;
  }
  return `"${question}" — resultado na FUTRA\n\nVeja:`;
}

export function profileShareText(displayName: string, rank: number, score: number, accuracy: number): string {
  return `${displayName} na FUTRA\n\n#${rank} ranking · ${score} score · ${accuracy}% precisão\n\nVeja o perfil:`;
}
