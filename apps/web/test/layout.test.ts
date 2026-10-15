import { describe, expect, it } from "vitest";
import { showsFooter } from "@/lib/layout";

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
