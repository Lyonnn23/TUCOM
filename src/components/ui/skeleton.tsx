import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/70",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-white/40 dark:before:via-white/10 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

/** Skeleton sized like a StationCard. Use a few of these in a list. */
function StationCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex gap-3">
      <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
      <Skeleton className="w-16 h-10 rounded-lg" />
    </div>
  );
}

function StationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <StationCardSkeleton key={i} />
      ))}
    </div>
  );
}

export { Skeleton, StationCardSkeleton, StationListSkeleton };
