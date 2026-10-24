import { Badge } from "@/components/ui/badge";
import { formatPercent, formatSteps } from "@/lib/format";

interface WorkBadgesProps {
  workRequired: number | null;
  maxWorkEfficiency: number | null;
}

export function WorkBadges({ workRequired, maxWorkEfficiency }: WorkBadgesProps) {
  return (
    <>
      {workRequired !== null && <Badge variant="outline">{formatSteps(workRequired, maxWorkEfficiency)}</Badge>}
      {maxWorkEfficiency !== null && <Badge variant="outline">Max efficiency {formatPercent(maxWorkEfficiency)}</Badge>}
    </>
  );
}
