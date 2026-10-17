import type { ItemEffects } from "@squire/api/recipe-book";
import { RecipeSection } from "@/components/recipes/RecipeSection";
import { formatDuration } from "@/lib/format";

export function ItemEffectsSection({ effects }: { effects: ItemEffects }) {
  const title = effects.steps === null ? "Effects" : `Effects · ${formatDuration(effects.steps)}`;
  return (
    <RecipeSection title={title}>
      <ul className="space-y-1 py-1">
        {effects.effects.map((effect) => (
          <li key={effect.text}>
            {effect.text}
            {effect.fine && <span className="ml-2 text-sm text-muted-foreground"> {effect.fine} fine</span>}
          </li>
        ))}
      </ul>
    </RecipeSection>
  );
}
