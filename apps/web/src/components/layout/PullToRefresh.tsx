import { RefreshCw } from "lucide-react";
import { useGameDataContext } from "@/contexts/game-data-context";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { cn } from "@/lib/utils";

export function PullToRefresh() {
  const { refresh } = useGameDataContext();
  const { pull, status, isReady } = usePullToRefresh(refresh);

  if (status === "failed" && pull === 0) {
    return (
      <p
        role="status"
        className="fixed inset-x-0 top-14 z-20 mx-auto w-fit rounded-full border bg-background px-3 py-1 text-sm shadow"
      >
        Couldn't refresh
      </p>
    );
  }
  if (pull === 0 && status !== "refreshing") {
    return null;
  }
  return (
    <div
      role="status"
      aria-label={status === "refreshing" ? "Refreshing game data" : isReady ? "Release to refresh" : "Pull to refresh"}
      className="fixed inset-x-0 top-14 z-20 mx-auto flex size-9 items-center justify-center rounded-full border bg-background shadow"
      style={{ transform: `translateY(${status === "refreshing" ? 16 : pull / 2}px)` }}
    >
      <RefreshCw
        className={cn(
          "size-4 text-muted-foreground",
          status === "refreshing" && "animate-spin",
          isReady && "text-foreground",
        )}
        style={status === "refreshing" ? undefined : { transform: `rotate(${pull * 3}deg)` }}
      />
    </div>
  );
}
