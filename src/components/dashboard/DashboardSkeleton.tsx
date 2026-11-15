export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-5">
      <span className="sr-only">Loading your dashboard…</span>
      <div className="space-y-2"><div className="h-3 w-32 animate-pulse rounded bg-app-muted motion-reduce:animate-none" /><div className="h-8 w-64 max-w-full animate-pulse rounded bg-app-muted motion-reduce:animate-none" /><div className="h-4 w-48 max-w-full animate-pulse rounded bg-app-muted motion-reduce:animate-none" /></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="min-h-80 animate-pulse rounded-card-lg border border-app-border bg-app-card motion-reduce:animate-none sm:col-span-2" />
        {Array.from({ length: 7 }, (_, index) => <div key={index} className="min-h-40 animate-pulse rounded-card-lg border border-app-border bg-app-card motion-reduce:animate-none" />)}
      </div>
    </div>
  );
}
