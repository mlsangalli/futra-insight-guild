import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Trophy, LayoutDashboard, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Browse', path: '/browse' },
  { icon: Trophy, label: 'Ranking', path: '/leaderboard' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: User, label: 'Profile', path: '/login' },
];

export function BottomNav() {
  const location = useLocation();
  const { user, profile } = useAuth();

  const items = NAV_ITEMS.map(item => {
    if (item.label === 'Profile' && user) {
      return { ...item, path: `/profile/${profile?.username || ''}`, label: 'Perfil' };
    }
    if (item.label === 'Profile') {
      return { ...item, path: '/login', label: 'Entrar' };
    }
    return item;
  });

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-header border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map(item => (
          <Link
            key={item.label}
            to={item.path}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors',
              isActive(item.path)
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <item.icon className={cn('h-5 w-5', isActive(item.path) && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]')} />
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
