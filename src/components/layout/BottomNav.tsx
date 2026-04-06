import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollDirection } from '@/hooks/useScrollDirection';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Browse', path: '/browse' },
  { icon: PlusCircle, label: 'Create', path: '/create-market', highlight: true },
  { icon: Trophy, label: 'Ranking', path: '/leaderboard' },
  { icon: User, label: 'Profile', path: '/login' },
];

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const show = useScrollDirection();

  const items = NAV_ITEMS.map(item => {
    if (item.label === 'Profile' && user) {
      return { ...item, path: '/dashboard', label: 'Profile' };
    }
    if (item.label === 'Profile') {
      return { ...item, path: '/login', label: 'Login' };
    }
    return item;
  });

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-md border-t border-border/30 transition-transform duration-300',
        !show && 'translate-y-full'
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {items.map(item => (
          <Link
            key={item.label}
            to={item.path}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors min-h-[44px] min-w-[44px]',
              item.highlight ? '' : isActive(item.path)
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            {item.highlight ? (
              <div className="gradient-primary rounded-full p-2.5 -mt-4 shadow-lg shadow-primary/25">
                <item.icon className="h-5 w-5 text-primary-foreground" />
              </div>
            ) : (
              <>
                <item.icon className={cn('h-5 w-5', isActive(item.path) && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]')} />
                {isActive(item.path) && <span className="w-1 h-1 rounded-full bg-primary" />}
              </>
            )}
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
