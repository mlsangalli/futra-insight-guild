import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Bell, LogOut, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORIES } from '@/data/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';

const NAV_ITEMS = [
  { label: 'Browse', path: '/browse' },
  { label: 'Trending', path: '/browse?filter=trending' },
  { label: 'Popular', path: '/browse?filter=popular' },
  { label: 'New', path: '/browse?filter=new' },
  { label: 'Ending Soon', path: '/browse?filter=ending' },
  { label: 'Leaderboard', path: '/leaderboard' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdmin();

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
              <Link to="/notifications" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-700 transition-colors relative">
                <Bell className="h-5 w-5" />
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
                    <Link to="/dashboard"><User className="h-4 w-4 mr-1" /> {profile?.username || 'Profile'}</Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild><Link to="/login">Log in</Link></Button>
                  <Button size="sm" className="gradient-primary border-0" asChild><Link to="/signup">Sign up</Link></Button>
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
              <input type="text" placeholder="Search markets..." className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-800 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" autoFocus onKeyDown={e => { if (e.key === 'Enter') { navigate(`/search?q=${(e.target as HTMLInputElement).value}`); setSearchOpen(false); } }} />
            </div>
          </div>
        )}

        {/* Category bar - scrollable on mobile when menu is open, always visible on desktop */}
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
            {/* Scrollable categories */}
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
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { handleSignOut(); setMobileOpen(false); }}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="flex-1" asChild>
                    <Link to="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
                  </Button>
                  <Button size="sm" className="flex-1 gradient-primary border-0" asChild>
                    <Link to="/signup" onClick={() => setMobileOpen(false)}>Sign up</Link>
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
