// @vitest-environment node
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { GearItem, GearPick } from "@squire/api/gear-data";
import { gearSetCode, gearSetEntries } from "@/lib/gear-set-code";

const gearItem = (id: string, extra: Partial<GearItem>): GearItem => ({
  id,
  name: id,
  icon: "",
  quality: null,
  isCollectible: false,
  keywords: [],
  gameId: `game-${id}`,
  slot: "tool",
  requirements: [],
  stats: [],
  tierStats: {},
  ...extra,
});
const pick = (
  id: string,
  slot: GearPick["slot"],
  quality: GearPick["quality"],
  extra: Partial<GearItem> = {},
): GearPick => ({
  slot,
  item: gearItem(id, { slot, ...extra }),
  quality,
});

describe("gearSetEntries", () => {
  it("lists every slot in the game's order, with empty slots as null", () => {
    const entries = gearSetEntries([]);
    expect(entries.map((e) => (e.index === undefined ? e.type : `${e.type}${e.index}`))).toEqual([
      ...["head", "cape", "back", "chest", "primary", "secondary", "hands", "legs", "neck", "feet"],
      ...["ring0", "ring1", "tool0", "tool1", "tool2", "tool3", "tool4", "tool5"],
    ]);
    expect(entries.every((e) => e.item === "null")).toBe(true);
  });

  it("writes each item's game id and quality, falling back to the item's own quality", () => {
    const entries = gearSetEntries([
      pick("oven_mittens", "hands", "uncommon"),
      pick("cape_of_half_achiever", "cape", null, { quality: "legendary" }),
    ]);
    expect(entries.find((e) => e.type === "hands")?.item).toBe(
      JSON.stringify({ id: "game-oven_mittens", quality: "uncommon", tag: null }),
    );
    expect(JSON.parse(entries.find((e) => e.type === "cape")!.item)).toMatchObject({ quality: "legendary" });
  });

  it("puts rings and tools in order by index", () => {
    const entries = gearSetEntries([
      pick("ring_a", "ring", null),
      pick("ring_b", "ring", null),
      pick("saw", "tool", null),
    ]);
    const ids = entries.map((e) => (e.item === "null" ? null : (JSON.parse(e.item) as { id: string }).id));
    expect(ids.slice(10, 13)).toEqual(["game-ring_a", "game-ring_b", "game-saw"]);
  });

  it("leaves a slot empty when the game id is unknown", () => {
    expect(gearSetEntries([pick("mystery", "head", null, { gameId: null })])[0]?.item).toBe("null");
  });
});

describe("gearSetCode", () => {
  it("gzips and base64-encodes the gear set, as the game does", async () => {
    const picks = [pick("oven_mittens", "hands", "uncommon")];
    const code = await gearSetCode(picks);
    const decoded = JSON.parse(gunzipSync(Buffer.from(code, "base64")).toString("utf8")) as unknown;
    expect(decoded).toEqual({ items: gearSetEntries(picks) });
  });
});
