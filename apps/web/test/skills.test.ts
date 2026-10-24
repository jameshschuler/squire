import { describe, expect, it } from "vitest";
import { knownOption, skillOptions } from "@/lib/skills";

const recipe = (skills: { id: string; name: string }[]) => ({ skills: skills.map((s) => ({ ...s, level: 1 })) });

describe("skillOptions", () => {
  it("returns each skill once, sorted by name", () => {
    const recipes = [
      recipe([{ id: "smithing", name: "Smithing" }]),
      recipe([
        { id: "cooking", name: "Cooking" },
        { id: "smithing", name: "Smithing" },
      ]),
    ];
    expect(skillOptions(recipes)).toEqual([
      { id: "cooking", name: "Cooking" },
      { id: "smithing", name: "Smithing" },
    ]);
  });

  it("returns nothing for an empty list", () => {
    expect(skillOptions([])).toEqual([]);
  });
});

describe("knownOption", () => {
  const options = [{ id: "mining", name: "Mining" }];

  it.each([
    ["mining", "mining"],
    ["cooking", undefined],
    [undefined, undefined],
  ])("keeps %s only if it's an option → %s", (selected, expected) => {
    expect(knownOption(options, selected)).toBe(expected);
  });
});
