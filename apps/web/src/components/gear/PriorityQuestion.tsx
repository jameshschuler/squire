import { useState } from "react";
import type { Goal, GoalId } from "@squire/api/gear-data";
import { Button } from "@/components/ui/button";
import { MAX_GOALS } from "@/lib/gear-search";

interface PriorityQuestionProps {
  goals: Goal[];
  onChoose: (goals: GoalId[]) => void;
}

export function PriorityQuestion({ goals, onChoose }: PriorityQuestionProps) {
  const [picked, setPicked] = useState<GoalId[]>([]);
  const toggle = (id: GoalId) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((g) => g !== id) : current.length < MAX_GOALS ? [...current, id] : current,
    );
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {goals.map((goal) => {
          const rank = picked.indexOf(goal.id) + 1;
          return (
            <Button
              key={goal.id}
              size="sm"
              variant={rank ? "default" : "outline"}
              className="rounded-full"
              aria-pressed={rank > 0}
              onClick={() => toggle(goal.id)}
            >
              {rank > 0 && <span className="text-xs opacity-80">{rank}</span>}
              {goal.label}
            </Button>
          );
        })}
      </div>
      <Button size="sm" disabled={picked.length === 0} onClick={() => onChoose(picked)}>
        Find gear
      </Button>
    </div>
  );
}
