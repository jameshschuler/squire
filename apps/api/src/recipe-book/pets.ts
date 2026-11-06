import type { PetDetail } from "@walkscape-community/data-api-client";
import { petIcon } from "@walkscape-community/gear-optimizer";
import { attributeEffects, type EffectNames } from "./effects.js";
import type { ItemSummary, PetPage } from "./types.js";

export function petPages(pets: PetDetail[], names: EffectNames, eggsByName: Map<string, ItemSummary>): PetPage[] {
  return pets
    .map((pet) => ({
      id: pet.id,
      name: pet.name,
      description: pet.desc,
      icon: petIcon(pet),
      egg: eggsByName.get(pet.egg.name) ?? null,
      levels: pet.levels.map(({ level, stage, attributes }) => ({
        level,
        stage,
        effects: attributeEffects(attributes, names),
      })),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
