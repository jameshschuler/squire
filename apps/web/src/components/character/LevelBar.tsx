import type { LevelProgress } from "@walkscape-community/gear-optimizer";
import { Progress } from "@/components/ui/progress";
import { levelPercent, nextLevelLabel } from "@/lib/levels";
import { cn } from "@/lib/utils";

interface LevelBarProps {
  name: string;
  progress: LevelProgress;
  unit: "XP" | "steps";
  className?: string;
}

export function LevelBar({ name, progress, unit, className }: LevelBarProps) {
  const label = nextLevelLabel(progress, unit);

  return (
    <Progress
      value={levelPercent(progress)}
      aria-label={`${name}: ${label}`}
      title={label}
      className={cn("h-1", className)}
    />
  );
}
