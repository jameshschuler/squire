import type { ReactNode } from "react";

export function RecipeSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-muted-foreground mb-1 text-sm font-medium uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}
