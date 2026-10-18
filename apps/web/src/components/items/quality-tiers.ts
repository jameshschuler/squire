import type { ItemQuality } from "@squire/api/recipe-book";

export const CRAFTED_TIER_NAMES: Record<ItemQuality, string> = {
  common: "Normal",
  uncommon: "Good",
  rare: "Great",
  epic: "Excellent",
  legendary: "Perfect",
  ethereal: "Eternal",
};
