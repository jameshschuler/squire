import { describe, expect, it } from "vitest";
import type { GearPick } from "@squire/api/gear-data";
import { gearCells, pickQuality, toolCells } from "@/lib/gear-grid";

const pick = (id: string, slot: GearPick["slot"]) => ({ slot, item: { id }, quality: null }) as unknown as GearPick;

describe("gearCells", () => {
  it("lays out the slots like the game, three across", () => {
    expect(gearCells([]).map((c) => c.label)).toEqual([
      ...["Cape", "Head", "Back", "Hands", "Chest", "Neck"],
      ...["Primary", "Legs", "Secondary", "Ring 1", "Feet", "Ring 2"],
    ]);
  });

  it("puts each pick in its slot and leaves the rest empty", () => {
    const cells = gearCells([pick("boots", "feet"), pick("ring_a", "ring"), pick("ring_b", "ring")]);
    const at = (label: string) => cells.find((c) => c.label === label)?.pick?.item.id ?? null;
    expect([at("Feet"), at("Ring 1"), at("Ring 2"), at("Head")]).toEqual(["boots", "ring_a", "ring_b", null]);
  });
});

describe("toolCells", () => {
  it("shows one cell per tool slot the character has", () => {
    const cells = toolCells([pick("saw", "tool")], 4);
    expect(cells.map((c) => [c.label, c.pick?.item.id ?? null])).toEqual([
      ["Tool 1", "saw"],
      ["Tool 2", null],
      ["Tool 3", null],
      ["Tool 4", null],
    ]);
  });
});

describe("pickQuality", () => {
  it.each([
    ["epic", "common", "epic"],
    [null, "rare", "rare"],
    [null, null, null],
  ] as const)("uses the pick's quality %s over the item's %s", (quality, itemQuality, expected) => {
    const gearPick = { slot: "hands", item: { id: "gloves", quality: itemQuality }, quality } as unknown as GearPick;
    expect(pickQuality(gearPick)).toBe(expected);
  });
});
