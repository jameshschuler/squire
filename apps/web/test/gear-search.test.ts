import { describe, expect, it } from "vitest";
import { validateGearSearch } from "@/lib/gear-search";

describe("validateGearSearch", () => {
  it("keeps the answers it understands", () => {
    expect(validateGearSearch({ target: "activity:mine", location: "best", gear: "mine" })).toEqual({
      target: "activity:mine",
      location: "best",
      gear: "mine",
    });
  });

  it("drops answers of the wrong shape", () => {
    expect(validateGearSearch({ target: 4, location: ["x"], gear: "theirs" })).toEqual({
      target: undefined,
      location: undefined,
      gear: undefined,
    });
  });
});
