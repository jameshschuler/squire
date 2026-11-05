import { Badge } from "@/components/ui/badge";
import { formatStepCount } from "@/lib/format";
import { wearDescription, type ItemWear } from "@/lib/wear";

export function WearBadge({ wear }: { wear: ItemWear }) {
  return (
    <Badge variant="outline" title={wearDescription(wear)} className="font-normal text-muted-foreground tabular-nums">
      W.E.A.R. {formatStepCount(wear.steps)}
    </Badge>
  );
}
