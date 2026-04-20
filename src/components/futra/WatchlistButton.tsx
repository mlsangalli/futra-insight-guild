import { Bookmark } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { useIsWatching, useToggleWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Props {
  marketId: string;
  compact?: boolean;
}

export function WatchlistButton({ marketId, compact }: Props) {
  const { user } = useAuth();
  const { data: isWatching } = useIsWatching(marketId);
  const toggleWatchlist = useToggleWatchlist();

  if (!user) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist.mutate(marketId);
  };

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={handleClick}
      >
        <Bookmark className={cn('h-3.5 w-3.5', isWatching && 'fill-current text-primary')} />
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <Bookmark className={cn('h-4 w-4 mr-1', isWatching && 'fill-current text-primary')} />
      {isWatching ? 'Salvo' : 'Salvar'}
    </Button>
  );
}
