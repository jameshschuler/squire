import type { AnswerLocation } from "@/lib/gear-answer";
import { StatTiles } from "./StatTiles";

export function LocationBonuses({ name, region, tiles }: AnswerLocation) {
  return (
    <section aria-label="Location" className="space-y-1">
      <div>
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Location bonuses</h3>
        <p className="text-sm">
          {name} <span className="text-xs text-muted-foreground">{region}</span>
        </p>
      </div>
      <StatTiles tiles={tiles} />
    </section>
  );
}
