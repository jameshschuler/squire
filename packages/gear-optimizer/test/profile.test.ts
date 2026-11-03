import { describe, expect, it } from "vitest";
import { petOf } from "../src/profile.js";
import type { PetView } from "../src/types.js";

const mummy: PetView = { id: "mummy", name: "Mummy", rareId: "silky_mummy", icon: "", levels: [] };

describe("petOf", () => {
  it.each([
    ["mummy", mummy],
    ["silky_mummy", mummy],
    ["camel", undefined],
  ])("finds the pet for species %s", (species, pet) => {
    expect(petOf([mummy], species)).toBe(pet);
  });
});
