"use client";

export function AppSkeleton() {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Left Sidebar Skeleton */}
      <div className="flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 p-4 pb-2">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-6 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="px-4 py-2">
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
        </div>
        <div className="px-4 pb-2">
          <div className="h-9 w-full bg-sidebar-accent/50 rounded-md animate-pulse" />
        </div>
        <div className="px-4 pb-3">
          <div className="h-8 w-full bg-muted rounded animate-pulse" />
        </div>
        <div className="flex-1 px-2">
          <div className="space-y-1 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-3">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Interface Skeleton */}
      <div className="flex flex-1 flex-col h-full bg-background relative">
        <div className="flex items-center gap-3 border-b p-4 shadow-sm bg-background/80 backdrop-blur-md">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          <div>
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-32 bg-muted rounded animate-pulse mt-1" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>

      {/* Right Sidebar Skeleton */}
      <div className="flex h-full w-80 flex-col border-l border-sidebar-border bg-sidebar">
        <div className="flex items-center justify-between border-b border-sidebar-border p-4">
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex-1 p-4 space-y-6">
          <div className="space-y-3">
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-sidebar-accent/50 rounded-md animate-pulse" />
            <div className="h-12 w-full bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="space-y-1 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-full bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
