import { Badge } from "@/components/ui/badge";
import { formatStepCount } from "@/lib/format";
import { itemStepsDescription, type ItemSteps } from "@/lib/drop-rates";

export function StepsBadge({ steps }: { steps: ItemSteps }) {
  return (
    <Badge
      variant="outline"
      title={itemStepsDescription(steps)}
      className="font-normal text-muted-foreground tabular-nums"
    >
      {formatStepCount(steps.steps)} each
    </Badge>
  );
}
