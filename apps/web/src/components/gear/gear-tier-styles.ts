import type { ItemQuality } from "@squire/api/recipe-book";

export const GEAR_TIER_STYLES: Record<ItemQuality, string> = {
  common: "border-zinc-400 shadow-[0_0_8px_-2px_var(--color-zinc-400)]",
  uncommon: "border-lime-500 shadow-[0_0_8px_-2px_var(--color-lime-500)]",
  rare: "border-teal-400 shadow-[0_0_8px_-2px_var(--color-teal-400)]",
  epic: "border-fuchsia-400 shadow-[0_0_8px_-2px_var(--color-fuchsia-400)]",
  legendary: "border-amber-400 shadow-[0_0_8px_-2px_var(--color-amber-400)]",
  ethereal: "border-red-400 shadow-[0_0_8px_-2px_var(--color-red-400)]",
};
