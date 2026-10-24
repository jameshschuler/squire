import { describe, expect, it } from "vitest";
import { activeTab, showsFooter } from "@/lib/layout";

describe("showsFooter", () => {
  it.each([
    ["/", true],
    ["/loot", true],
    ["/recipes/bake_bread", false],
    ["/items/gold_bar", false],
  ])("on %s: %s", (pathname, expected) => {
    expect(showsFooter(pathname)).toBe(expected);
  });
});

describe("activeTab", () => {
  it.each([
    ["/", "/"],
    ["/materials", "/materials"],
    ["/food", "/food"],
    ["/loot", "/loot"],
    ["/gear", "/gear"],
    ["/favorites", "/"],
  ])("on %s: %s", (pathname, expected) => {
    expect(activeTab(pathname, "/loot")).toBe(expected);
  });

  it.each([
    ["/items/bones", "/materials", "/materials"],
    ["/items/birch_skis", "/loot", "/loot"],
    ["/recipes/bake_bread", "/food", "/food"],
    ["/recipes/bake_bread", "/", "/"],
  ] as const)("keeps the tab you came from on a detail page: %s from %s", (pathname, previous, expected) => {
    expect(activeTab(pathname, previous)).toBe(expected);
  });
});
