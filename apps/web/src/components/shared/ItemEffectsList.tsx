import type { ItemEffects } from "@squire/api/recipe-book";
import { formatDuration } from "@/lib/format";

export function ItemEffectsList({ effects }: { effects: ItemEffects }) {
  return (
    <div className="space-y-1 py-1">
      <ul className="space-y-1">
        {effects.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {effects.steps !== null && <p className="text-sm text-muted-foreground">{formatDuration(effects.steps)}</p>}
    </div>
  );
}
