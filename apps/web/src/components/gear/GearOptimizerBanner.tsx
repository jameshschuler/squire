import { Sparkles } from "lucide-react";

export function GearOptimizerBanner() {
  return (
    <aside className="mt-3 flex gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
      <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p>
        <span className="font-medium">Gear optimizer coming soon.</span>{" "}
        <span className="text-muted-foreground">
          Pick an activity or recipe and get the set from your own gear that takes the fewest steps.
        </span>
      </p>
    </aside>
  );
}
