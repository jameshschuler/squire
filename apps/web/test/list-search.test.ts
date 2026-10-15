import { describe, expect, it } from "vitest";
import { validateListSearch } from "@/lib/list-search";

describe("validateListSearch", () => {
  it("keeps string q and skill", () => {
    expect(validateListSearch({ q: "gold", skill: "mining" })).toEqual({ q: "gold", skill: "mining" });
  });

  it("drops anything that isn't a string", () => {
    expect(validateListSearch({ q: 3, skill: ["mining"], other: "x" })).toEqual({ q: undefined, skill: undefined });
  });
});
