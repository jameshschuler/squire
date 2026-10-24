import { Sparkles } from "lucide-react";

export function ActivitiesPage() {
  return (
    <aside className="mt-3 flex gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
      <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p>
        <span className="font-medium">Activities coming soon.</span>{" "}
        <span className="text-muted-foreground">
          Look up any activity: where to do it, the level it needs and what it drops.
        </span>
      </p>
    </aside>
  );
}
