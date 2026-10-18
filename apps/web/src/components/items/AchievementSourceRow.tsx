import { Award } from "lucide-react";
import type { AchievementSource } from "@squire/api/recipe-book";
import { SourceIconTile } from "./SourceIconTile";

export function AchievementSourceRow({ source }: { source: AchievementSource }) {
  return (
    <div className="flex items-center gap-3">
      <SourceIconTile icon={Award} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{source.name}</p>
        <p className="text-sm text-muted-foreground">Achievement</p>
      </div>
    </div>
  );
}
