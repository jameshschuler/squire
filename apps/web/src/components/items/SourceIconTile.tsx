import type { LucideIcon } from "lucide-react";

export function SourceIconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
      <Icon className="size-4 text-muted-foreground" />
    </span>
  );
}
