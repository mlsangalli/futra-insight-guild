import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Menu, X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORIES } from '@/data/types';
import { cn } from '@/lib/utils';

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

  return (
    <header className="sticky top-0 z-50 border-b border-border glass">
      <div className="container mx-auto px-4">
        {/* Top row */}
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-display font-bold text-xl tracking-tight">
              <span className="gradient-primary-text">FUTRA</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    location.pathname === item.path
                      ? 'text-foreground bg-surface-700'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-800'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-700 transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>

            <Link to="/notifications" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-700 transition-colors relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-negative" />
            </Link>

            <div className="hidden sm:flex items-center gap-2 ml-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button size="sm" className="gradient-primary border-0" asChild>
                <Link to="/signup">Sign up</Link>
              </Button>
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="pb-3 animate-fade-in">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search markets..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-800 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    window.location.href = `/search?q=${(e.target as HTMLInputElement).value}`;
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Category bar - desktop */}
        <div className="hidden lg:flex items-center gap-1 pb-2 -mt-1 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.key}
              to={`/category/${cat.key}`}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                location.pathname === `/category/${cat.key}`
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-800'
              )}
            >
              {cat.emoji} {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-card animate-fade-in">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-700"
              >
                {item.label}
              </Link>
            ))}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {CATEGORIES.map(cat => (
                <Link
                  key={cat.key}
                  to={`/category/${cat.key}`}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground bg-surface-800"
                >
                  {cat.emoji} {cat.label}
                </Link>
              ))}
            </div>
            <div className="flex gap-2 pt-3">
              <Button variant="ghost" size="sm" className="flex-1" asChild>
                <Link to="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
              </Button>
              <Button size="sm" className="flex-1 gradient-primary border-0" asChild>
                <Link to="/signup" onClick={() => setMobileOpen(false)}>Sign up</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
