import type { ReactNode } from "react";
import { Hourglass } from "lucide-react";

export function ComingSoonBanner({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="flex gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
      <Hourglass className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p>
        <span className="font-medium">{title}</span> <span className="text-muted-foreground">{children}</span>
      </p>
    </aside>
  );
}
