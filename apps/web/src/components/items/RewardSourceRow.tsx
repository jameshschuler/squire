import { Trophy } from "lucide-react";
import type { RewardSource } from "@squire/api/recipe-book";
import { SourceIconTile } from "./SourceIconTile";

export function RewardSourceRow({ source }: { source: RewardSource }) {
  return (
    <div className="flex items-center gap-3">
      <SourceIconTile icon={Trophy} />
      <p className="font-medium">{source.name}</p>
    </div>
  );
}
