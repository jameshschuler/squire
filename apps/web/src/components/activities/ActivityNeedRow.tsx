import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import type { ActivityNeed } from "@squire/api/recipe-book";
import { GameIcon } from "@/components/shared/GameIcon";
import { formatSkillLevel } from "@/lib/format";

export function ActivityNeedRow({ need }: { need: ActivityNeed }) {
  const content = (
    <>
      <span className="font-medium">{need.label}</span>
      {need.level && <span className="text-sm text-muted-foreground">{formatSkillLevel(need.level)}</span>}
    </>
  );
  if (need.item) {
    return (
      <Link to="/items/$itemId" params={{ itemId: need.item.id }} className="flex items-center gap-3 py-2">
        <GameIcon path={need.item.icon} />
        {content}
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3 py-2">
      <Check className="mx-1.5 size-5 shrink-0 text-muted-foreground" />
      {content}
    </div>
  );
}
