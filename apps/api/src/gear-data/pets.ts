import type { PetDetail } from "@walkscape-community/data-api-client";
import { gearStats } from "./items.js";
import type { PetView } from "./types.js";

export function petViews(pets: PetDetail[]): PetView[] {
  return pets
    .map((pet) => ({
      id: pet.id,
      name: pet.name,
      rareId: pet.rareId,
      icon: adultSprite(pet),
      levels: pet.levels.map(({ level, attributes }) => ({ level, stats: gearStats(attributes) })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function adultSprite(pet: PetDetail): string {
  const sprites = pet.looks[0]?.sprites ?? [];
  return (sprites.find((s) => s.stage === "adult") ?? sprites[0])?.sprite ?? "";
}
