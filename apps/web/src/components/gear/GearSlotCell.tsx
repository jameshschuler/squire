import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { ItemQuality } from "@squire/api/recipe-book";
import { GameIcon } from "@/components/shared/GameIcon";
import { cn } from "@/lib/utils";
import { GEAR_TIER_STYLES } from "./gear-tier-styles";

interface GearSlotCellProps {
  label: string;
  name: string | null;
  icon: string;
  itemId: string | null;
  quality?: ItemQuality | null;
}

export function GearSlotCell({ label, name, icon, itemId, quality = null }: GearSlotCellProps) {
  const body: ReactNode = (
    <>
      <span className="text-[11px] font-semibold">{label}</span>
      {name ? (
        <>
          <GameIcon path={icon} size={36} />
          <span className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">{name}</span>
          {quality && <span className="sr-only">, {quality}</span>}
        </>
      ) : (
        <span className="flex h-9 items-center text-[11px] text-muted-foreground">{"Player's choice"}</span>
      )}
    </>
  );
  const className = cn(
    "flex min-h-24 flex-col items-center gap-1 rounded-lg border bg-background p-1.5 text-center",
    quality && GEAR_TIER_STYLES[quality],
  );
  return itemId ? (
    <Link to="/items/$itemId" params={{ itemId }} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
