import { describe, expect, it } from "vitest";
import exportFixture from "../../../fixtures/character/export.json";
import { readStoredCharacter, storeCharacter } from "@/lib/character";

const exportText = JSON.stringify(exportFixture);

describe("readStoredCharacter", () => {
  it("reads back a stored export and when it was imported", () => {
    const stored = storeCharacter(exportText, new Date("2026-10-24T21:41:00Z"));
    expect(readStoredCharacter(stored)).toMatchObject({
      character: { name: "Test Walker", toolSlots: 6 },
      savedAt: "2026-10-24T21:41:00.000Z",
    });
  });

  it.each([
    ["nothing saved", null],
    ["text that isn't JSON", "{ name"],
    ["a bare export without an import time", exportText],
    ["an import time that isn't a date", JSON.stringify({ exportText, savedAt: "garbage" })],
    [
      "an import time with an export that isn't valid",
      JSON.stringify({ exportText: '{"name":"x"}', savedAt: "2026-10-24T21:41:00Z" }),
    ],
  ])("returns no character for %s", (_, stored) => {
    expect(readStoredCharacter(stored)).toBeNull();
  });
});
