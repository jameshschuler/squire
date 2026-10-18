import { useState } from "react";
import type { ItemEffects, ItemQuality } from "@squire/api/recipe-book";
import { RecipeSection } from "@/components/recipes/RecipeSection";
import { groupByCondition } from "@/lib/effects";
import { formatDuration } from "@/lib/format";
import { QualityTierPicker } from "./QualityTierPicker";

export function ItemEffectsSection({ effects }: { effects: ItemEffects }) {
  const title = effects.steps === null ? "Effects" : `Effects · ${formatDuration(effects.steps)}`;
  const [quality, setQuality] = useState<ItemQuality>("common");
  const shown = effects.tiers.find((tier) => tier.quality === quality)?.effects ?? effects.effects;
  const hasFine = shown.some((effect) => effect.fine !== null);
  return (
    <RecipeSection title={title}>
      {effects.tiers.length > 0 && (
        <QualityTierPicker
          tiers={["common", ...effects.tiers.map((tier) => tier.quality)]}
          selected={quality}
          onSelect={setQuality}
        />
      )}
      <table className="w-full">
        {groupByCondition(shown).map(([condition, group]) => (
          <tbody key={condition}>
            <tr className="text-sm text-muted-foreground">
              <th scope="rowgroup" colSpan={hasFine ? 1 : 2} className="pt-2 pb-1 text-left font-normal">
                {condition}
              </th>
              {hasFine && (
                <>
                  <th scope="col" className="w-16 pt-2 pb-1 text-right font-normal">
                    Normal
                  </th>
                  <th scope="col" className="w-16 pt-2 pb-1 text-right font-normal">
                    Fine
                  </th>
                </>
              )}
            </tr>
            {group.map((effect, i) => (
              <tr key={`${effect.stat}-${i}`}>
                <td className="py-0.5 pr-2">{effect.stat}</td>
                <td className="py-0.5 text-right tabular-nums">{effect.normal}</td>
                {hasFine && <td className="py-0.5 text-right tabular-nums">{effect.fine}</td>}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </RecipeSection>
  );
}
