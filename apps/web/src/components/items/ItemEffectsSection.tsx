import { useState } from "react";
import type { ItemEffects, ItemQuality } from "@squire/api/recipe-book";
import { EffectTable } from "@/components/shared/EffectTable";
import { Section } from "@/components/shared/Section";
import { formatStepCount } from "@/lib/format";
import { QualityTierPicker } from "./QualityTierPicker";

export function ItemEffectsSection({ effects }: { effects: ItemEffects }) {
  const title = effects.steps === null ? "Effects" : `Effects · ${formatStepCount(effects.steps)}`;
  const [quality, setQuality] = useState<ItemQuality>("common");
  const shown = effects.tiers.find((tier) => tier.quality === quality)?.effects ?? effects.effects;

  return (
    <Section title={title}>
      {effects.tiers.length > 0 && (
        <QualityTierPicker
          tiers={["common", ...effects.tiers.map((tier) => tier.quality)]}
          selected={quality}
          onSelect={setQuality}
        />
      )}
      <EffectTable effects={shown} />
    </Section>
  );
}
