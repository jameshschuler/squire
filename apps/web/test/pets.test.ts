import { describe, expect, it } from "vitest";
import type { PetView } from "@walkscape-community/gear-optimizer";
import { petCollection } from "@/lib/pets";

const pet = (id: string, rareId: string): PetView => ({ id, name: id, rareId, icon: "", levels: [] });
const pets = [pet("camel", "two_hump_camel"), pet("mummy", "silky_mummy")];

describe("petCollection", () => {
  it("lists every pet, with the level of the ones owned", () => {
    expect(petCollection(pets, [{ species: "camel", level: 3 }]).map(({ pet, level }) => [pet.id, level])).toEqual([
      ["camel", 3],
      ["mummy", null],
    ]);
  });

  it("counts a rare pet as its pet, and keeps the higher level when both are owned", () => {
    const owned = [
      { species: "silky_mummy", level: 2 },
      { species: "mummy", level: 5 },
    ];

    expect(petCollection(pets, owned)[1]).toMatchObject({ pet: { id: "mummy" }, level: 5 });
  });

  it("ignores pets that aren't in the game data", () => {
    expect(petCollection(pets, [{ species: "dragon", level: 9 }]).every(({ level }) => level === null)).toBe(true);
  });
});
