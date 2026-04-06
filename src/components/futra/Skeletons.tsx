import { Skeleton } from '@/components/ui/skeleton';

export function MarketCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <div className="flex justify-between pt-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function MarketGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MarketCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-3 sm:gap-4 p-4">
      <Skeleton className="h-6 w-8 shrink-0" />
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-12" />
    </div>
  );
}

export function LeaderboardSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <LeaderboardRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <Skeleton className="w-20 h-20 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-3 w-16 ml-auto" />
            <Skeleton className="h-8 w-12 ml-auto" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export function PredictionRowSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function HeroMarketSkeleton() {
  return (
    <div className="glass-card gradient-border rounded-2xl p-8 space-y-6">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-5 w-3/4" />
      <div className="flex items-end gap-3">
        <Skeleton className="h-16 w-24" />
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="h-3 w-full rounded-full" />
      <div className="flex gap-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <p className="text-foreground font-medium mb-1">Something went wrong</p>
      <p className="text-sm text-muted-foreground mb-4">{message || 'Could not load the data. Please try again.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-16">
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <p className="text-foreground font-medium mb-1">{title}</p>
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      {action}
    </div>
  );
}
