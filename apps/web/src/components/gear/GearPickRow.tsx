import { Link } from "@tanstack/react-router";
import type { GearPick } from "@squire/api/gear-data";
import { GameIcon } from "@/components/shared/GameIcon";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { Badge } from "@/components/ui/badge";
import { formatTitle } from "@/lib/format";

interface GearPickRowProps {
  pick: GearPick;
  equipped: boolean;
}

export function GearPickRow({ pick, equipped }: GearPickRowProps) {
  const quality = pick.quality ?? pick.item.quality;
  return (
    <li>
      <Link to="/items/$itemId" params={{ itemId: pick.item.id }} className="flex items-center gap-3 py-2">
        <GameIcon path={pick.item.icon} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{pick.item.name}</span>
          <span className="block text-sm text-muted-foreground">{formatTitle(pick.slot)}</span>
        </span>
        {quality && <QualityBadge quality={quality} />}
        {equipped && (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            Equipped
          </Badge>
        )}
      </Link>
    </li>
  );
}
