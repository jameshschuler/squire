import { describe, expect, it } from "vitest";
import { capitalize, humanize, spaced } from "../src/recipe-book/text.js";

describe("text helpers", () => {
  it.each([
    ["adventuring_tool_set", "adventuring tool set", "Adventuring tool set"],
    ["mining", "mining", "Mining"],
    ["", "", ""],
  ])("formats %j", (id, expectedSpaced, expectedHuman) => {
    expect(spaced(id)).toBe(expectedSpaced);
    expect(humanize(id)).toBe(expectedHuman);
  });

  it("capitalizes only the first letter", () => {
    expect(capitalize("gathering skills and not Fishing")).toBe("Gathering skills and not Fishing");
  });
});
