import { Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GearTarget } from "@/lib/gear-targets";

interface TargetAnswerProps {
  target: GearTarget;
  onChange: () => void;
}

const LINK = "min-w-0 truncate underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none";

export function TargetAnswer({ target, onChange }: TargetAnswerProps) {
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[90%] items-center gap-1 rounded-2xl border bg-background py-1 pr-1 pl-4">
        {target.kind === "activity" ? (
          <Link to="/activities/$activityId" params={{ activityId: target.id }} className={LINK}>
            {target.name}
          </Link>
        ) : (
          <Link to="/recipes/$recipeId" params={{ recipeId: target.id }} className={LINK}>
            {target.name}
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onChange}
          aria-label={`Change answer: ${target.name}`}
          className="shrink-0 rounded-full text-muted-foreground"
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
