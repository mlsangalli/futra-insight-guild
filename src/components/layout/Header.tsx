import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Bell, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORIES } from '@/data/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { label: 'Browse', path: '/browse' },
  { label: 'Trending', path: '/browse?filter=trending' },
  { label: 'Leaderboard', path: '/leaderboard' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-display font-bold text-lg tracking-tight">
              <span className="gradient-primary-text">FUTRA</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    location.pathname === item.path
                      ? 'text-foreground bg-surface-700/60'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors">
              <Search className="h-4 w-4" />
            </button>

            {user && (
              <Link to="/notifications" className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors relative">
                <Bell className="h-4 w-4" />
              </Link>
            )}

            <div className="hidden sm:flex items-center gap-2 ml-2">
              {user ? (
                <>
                  <span className="text-xs text-muted-foreground font-display font-medium">{profile?.futra_credits?.toLocaleString() || 0} FC</span>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                    <Link to="/dashboard"><User className="h-3.5 w-3.5 mr-1" /> {profile?.username || 'Profile'}</Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8" onClick={handleSignOut}>
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" asChild>
                    <Link to="/login">Log in</Link>
                  </Button>
                  <Button size="sm" className="h-8 text-xs gradient-primary border-0" asChild>
                    <Link to="/signup">Sign up</Link>
                  </Button>
                </>
              )}
            </div>

            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground">
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="pb-3 animate-fade-in">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search markets..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-800 border border-border text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') window.location.href = `/search?q=${(e.target as HTMLInputElement).value}`;
                }}
              />
            </div>
          </div>
        )}

        <div className="hidden lg:flex items-center gap-0.5 pb-2 -mt-0.5 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.key}
              to={`/category/${cat.key}`}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap',
                location.pathname === `/category/${cat.key}`
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-secondary-foreground'
              )}
            >
              {cat.emoji} {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-card animate-fade-in">
          <div className="container mx-auto px-4 py-4 space-y-1">
            {NAV_ITEMS.map(item => (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-700/50">
                {item.label}
              </Link>
            ))}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
              {CATEGORIES.map(cat => (
                <Link key={cat.key} to={`/category/${cat.key}`} onClick={() => setMobileOpen(false)} className="px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground bg-surface-800">
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
                  <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground" asChild>
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
