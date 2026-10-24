import { describe, expect, it } from "vitest";
import exportFixture from "../../../fixtures/character/export.json";
import { readStoredCharacter } from "@/lib/character";

describe("readStoredCharacter", () => {
  it("reads a saved export", () => {
    expect(readStoredCharacter(JSON.stringify(exportFixture))).toMatchObject({ name: "Test Walker", toolSlots: 6 });
  });

  it.each([
    ["nothing saved", null],
    ["text that isn't JSON", "{ name"],
    ["JSON that isn't an export", '{"name":"x"}'],
  ])("returns no character for %s", (_, stored) => {
    expect(readStoredCharacter(stored)).toBeNull();
  });
});
