import { describe, expect, it } from "vitest";
import { loadGameData } from "../src/game-data.js";
import { fakeClient } from "./fake-client.js";

describe("loadGameData", () => {
  it("loads every resource the recipe book needs, tagged with the data version", async () => {
    const data = await loadGameData(fakeClient("v7").client);
    expect(data.version).toBe("v7");
    expect(data.recipes.map((r) => r.id)).toContain("smelt_a_gold_bar");
    expect(data.lootTables.map((t) => t.id)).toContain("mining_chest_table");
    expect(data.shops.map((s) => s.id)).toEqual(["granfiddich_tool_stall"]);
  });

  it("fails when the API doesn't report a version", async () => {
    const { client } = fakeClient();
    client.version = async () => ({});
    await expect(loadGameData(client)).rejects.toThrow("no version");
  });
});
