import { Skeleton } from "@/components/ui/kit";

export default function Loading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-64" />
    </div>
  );
}
