import { useState } from "react";
import { goalOf, type Goal, type GoalId } from "@squire/api/gear-data";
import { Button } from "@/components/ui/button";
import { MAX_GOALS } from "@/lib/gear-search";
import { cn } from "@/lib/utils";

interface PriorityQuestionProps {
  goals: Goal[];
  recommended: GoalId[];
  onChoose: (goals: GoalId[]) => void;
}

export function PriorityQuestion({ goals, recommended, onChoose }: PriorityQuestionProps) {
  const [picked, setPicked] = useState<GoalId[]>([]);
  const toggle = (id: GoalId) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((g) => g !== id) : current.length < MAX_GOALS ? [...current, id] : current,
    );
  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        className="h-auto w-full flex-col items-start gap-0 bg-background py-1.5"
        onClick={() => onChoose(recommended)}
      >
        <span>Use recommended</span>
        <span className="text-xs font-normal text-muted-foreground">
          {recommended.map((id) => goalOf(id).label).join(" › ")}
        </span>
      </Button>
      <p className="text-xs text-muted-foreground">Or pick your own:</p>
      <ul className="space-y-1">
        {goals.map((goal) => {
          const rank = picked.indexOf(goal.id) + 1;
          return (
            <li key={goal.id}>
              <button
                type="button"
                aria-pressed={rank > 0}
                onClick={() => toggle(goal.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-left",
                  rank > 0 && "border-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-xs",
                    rank > 0 && "border-foreground bg-foreground text-background",
                  )}
                >
                  {rank > 0 ? rank : ""}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{goal.label}</span>
                  <span className="block text-xs text-muted-foreground">{goal.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Button size="sm" disabled={picked.length === 0} onClick={() => onChoose(picked)}>
        Find gear
      </Button>
    </div>
  );
}
