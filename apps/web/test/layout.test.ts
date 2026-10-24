import { describe, expect, it } from "vitest";
import { activeTab, itemPage } from "@/lib/layout";

describe("itemPage", () => {
  it.each([
    ["/materials", "/materials"],
    ["/food", "/food"],
    ["/loot", "/loot"],
    ["/", undefined],
    ["/items/bones", undefined],
    ["/foods", undefined],
    ["/lootbox", undefined],
  ])("on %s: %s", (pathname, expected) => {
    expect(itemPage(pathname)).toBe(expected);
  });
});

describe("activeTab", () => {
  it.each([
    ["/", "recipes"],
    ["/materials", "items"],
    ["/food", "items"],
    ["/loot", "items"],
    ["/activities", "activities"],
    ["/activities/mine_gold_ore", "activities"],
    ["/gear", "gear"],
    ["/favorites", "recipes"],
    ["/about", undefined],
    ["/character", undefined],
  ])("on %s: %s", (pathname, expected) => {
    expect(activeTab(pathname, "gear")).toBe(expected);
  });

  it.each([
    ["/items/bones", "items"],
    ["/recipes/bake_bread", "recipes"],
    ["/items/bread", "recipes"],
  ] as const)("keeps the tab you came from on %s (from %s)", (pathname, previous) => {
    expect(activeTab(pathname, previous)).toBe(previous);
  });
});
