import { Skeleton } from "@/components/ui/skeleton";

export function RoomCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border/40 bg-card">
      <Skeleton className="aspect-video w-full bg-muted" />
      <div className="flex flex-col gap-2.5 p-4">
        <Skeleton className="h-5 w-3/4 bg-muted" />
        <Skeleton className="h-4 w-full bg-muted" />
        <Skeleton className="h-4 w-2/3 bg-muted" />
        <Skeleton className="mt-2 h-9 w-full bg-muted" />
      </div>
    </div>
  );
}
