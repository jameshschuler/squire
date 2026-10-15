import type { ChestSource } from "@jameshschuler/walkscape-sdk";
import { GameIcon } from "@/components/shared/GameIcon";

export function ChestSourceRow({ source }: { source: ChestSource }) {
  return (
    <div className="flex items-center gap-3">
      <GameIcon path={source.icon} />
      <p className="font-medium">{source.name}</p>
    </div>
  );
}
