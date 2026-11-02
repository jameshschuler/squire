import { petOf, type OwnedPet, type PetView } from "@walkscape-community/gear-optimizer";

export interface PetEntry {
  pet: PetView;
  level: number | null;
}

export function petCollection(pets: PetView[], owned: OwnedPet[]): PetEntry[] {
  const levels = new Map<string, number>();

  for (const { species, level } of owned) {
    const pet = petOf(pets, species);

    if (pet) {
      levels.set(pet.id, Math.max(levels.get(pet.id) ?? 0, level));
    }
  }

  return pets.map((pet) => ({ pet, level: levels.get(pet.id) ?? null }));
}
