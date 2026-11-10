import { Badge } from "@/components/ui/badge";
import {
  chanceDescription,
  formatChance,
  formatRateSteps,
  fromSource,
  stepsDescription,
  type ItemRate,
} from "@/lib/drop-rates";

export function DropRateTags({ rate, range, from }: ItemRate) {
  const steps = formatRateSteps(rate, range);

  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge
        variant="outline"
        title={fromSource(chanceDescription(range), from)}
        className="font-normal text-muted-foreground tabular-nums"
      >
        {formatChance(rate, range)}
      </Badge>
      {steps && (
        <Badge
          variant="outline"
          title={fromSource(stepsDescription(range), from)}
          className="font-normal text-muted-foreground tabular-nums"
        >
          {steps}
        </Badge>
      )}
    </div>
  );
}
