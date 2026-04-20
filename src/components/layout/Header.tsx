import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Bell, LogOut, User, Shield } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { CATEGORIES } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useUnreadCount } from '@/hooks/useNotifications';

const NAV_ITEMS = [
  { label: 'Explorar', path: '/browse' },
  { label: 'Bracket', path: '/bracket' },
  { label: 'Em alta', path: '/browse?filter=trending' },
  { label: 'Populares', path: '/browse?filter=popular' },
  { label: 'Ranking', path: '/leaderboard' },
  { label: 'Missões', path: '/missions' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { data: unreadCount } = useUnreadCount();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 glass-header">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 lg:h-16">
          <div className="flex items-center gap-4 lg:gap-8">
            <Link to="/" className="font-display font-bold text-lg lg:text-xl tracking-tight">
              <span className="gradient-primary-text">FUTRA</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <Link key={item.path} to={item.path} className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors', location.pathname === item.path ? 'text-foreground bg-surface-700' : 'text-muted-foreground hover:text-foreground hover:bg-surface-800')}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 lg:gap-2">
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-700 transition-colors">
              <Search className="h-5 w-5" />
            </button>

            {user && (
              <Link
                to="/notifications"
                aria-label={unreadCount ? `${unreadCount} notificações não lidas` : 'Notificações'}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-700 transition-colors relative"
              >
                <Bell className="h-5 w-5" />
                {!!unreadCount && unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            <div className="hidden sm:flex items-center gap-2 ml-2">
              {user ? (
                <>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/admin"><Shield className="h-4 w-4 mr-1" /> Admin</Link>
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">{profile?.futra_credits?.toLocaleString() || 0} FC</span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/dashboard"><User className="h-4 w-4 mr-1" /> {profile?.username || 'Perfil'}</Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild><Link to="/login">Entrar</Link></Button>
                  <Button size="sm" className="gradient-primary border-0" asChild><Link to="/signup">Criar conta</Link></Button>
                </>
              )}
            </div>

            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="pb-3 animate-fade-in">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Buscar mercados..." className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-800 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" autoFocus onKeyDown={e => { if (e.key === 'Enter') { navigate(`/search?q=${(e.target as HTMLInputElement).value}`); setSearchOpen(false); } }} />
            </div>
          </div>
        )}

        <div className="hidden lg:flex items-center gap-1 pb-2 -mt-1 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <Link key={cat.key} to={`/category/${cat.key}`} className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap', location.pathname === `/category/${cat.key}` ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-surface-800')}>
              {cat.emoji} {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-card animate-fade-in">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {NAV_ITEMS.map(item => (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-700">
                {item.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2 border-t border-border overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              {CATEGORIES.map(cat => (
                <Link key={cat.key} to={`/category/${cat.key}`} onClick={() => setMobileOpen(false)} className="px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground bg-surface-800 whitespace-nowrap shrink-0">
                  {cat.emoji} {cat.label}
                </Link>
              ))}
            </div>
            <div className="flex gap-2 pt-3">
              {user ? (
                <>
                  <Button variant="ghost" size="sm" className="flex-1" asChild>
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)}>Painel</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { handleSignOut(); setMobileOpen(false); }}>
                    Sair
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="flex-1" asChild>
                    <Link to="/login" onClick={() => setMobileOpen(false)}>Entrar</Link>
                  </Button>
                  <Button size="sm" className="flex-1 gradient-primary border-0" asChild>
                    <Link to="/signup" onClick={() => setMobileOpen(false)}>Criar conta</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
