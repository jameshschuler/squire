import { Loader2 } from "lucide-react";
import type { GameDataState } from "@/contexts/game-data-context";

export function GameDataStatus({ state }: { state: Exclude<GameDataState, { status: "ready" }> }) {
  if (state.status === "error") {
    return <p className="py-8 text-center text-destructive">{state.message}</p>;
  }
  return (
    <p className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Loading recipes…
    </p>
  );
}
