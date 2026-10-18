import type { ItemQuality } from "@squire/api/recipe-book";
import { QUALITY_STYLES } from "@/components/shared/quality-styles";
import { cn } from "@/lib/utils";
import { CRAFTED_TIER_NAMES } from "./quality-tiers";

interface QualityTierPickerProps {
  tiers: ItemQuality[];
  selected: ItemQuality;
  onSelect: (quality: ItemQuality) => void;
}

export function QualityTierPicker({ tiers, selected, onSelect }: QualityTierPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tiers.map((quality) => (
        <button
          key={quality}
          type="button"
          aria-pressed={quality === selected}
          onClick={() => onSelect(quality)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-sm",
            quality === selected ? QUALITY_STYLES[quality] : "text-muted-foreground",
          )}
        >
          {CRAFTED_TIER_NAMES[quality]}
        </button>
      ))}
    </div>
  );
}
