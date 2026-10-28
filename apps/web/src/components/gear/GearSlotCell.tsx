import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { GameIcon } from "@/components/shared/GameIcon";

interface GearSlotCellProps {
  label: string;
  name: string | null;
  icon: string;
  itemId: string | null;
  equipped?: boolean;
}

export function GearSlotCell({ label, name, icon, itemId, equipped = false }: GearSlotCellProps) {
  const body: ReactNode = (
    <>
      <span className="text-[11px] font-semibold">{label}</span>
      {name ? (
        <>
          <GameIcon path={icon} size={36} />
          <span className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">{name}</span>
        </>
      ) : (
        <span className="flex h-9 items-center text-[11px] text-muted-foreground">Nothing helps</span>
      )}
      {equipped && <Check aria-label="Equipped" className="absolute top-1 right-1 size-3.5 text-muted-foreground" />}
    </>
  );
  const className =
    "relative flex min-h-24 flex-col items-center gap-1 rounded-lg border bg-background p-1.5 text-center";
  return itemId ? (
    <Link to="/items/$itemId" params={{ itemId }} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
