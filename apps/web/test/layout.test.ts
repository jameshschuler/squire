import { describe, expect, it } from "vitest";
import { activeTab, showsFooter } from "@/lib/layout";

describe("showsFooter", () => {
  it.each([
    ["/", true],
    ["/favorites", true],
    ["/recipes/bake_bread", false],
    ["/items/gold_bar", false],
  ])("on %s: %s", (pathname, expected) => {
    expect(showsFooter(pathname)).toBe(expected);
  });
});

describe("activeTab", () => {
  it.each([
    ["/", "/"],
    ["/recipes/bake_bread", "/"],
    ["/items/bones", "/"],
    ["/materials", "/materials"],
    ["/favorites", "/favorites"],
  ])("on %s: %s", (pathname, expected) => {
    expect(activeTab(pathname)).toBe(expected);
  });
});
