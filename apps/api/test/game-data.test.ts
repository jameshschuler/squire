import { describe, expect, it } from "vitest";
import { loadGameData } from "../src/game-data.js";
import gearItems from "../../../fixtures/api/gear.json";
import { fakeClient } from "./fake-client.js";

describe("loadGameData", () => {
  it("loads every resource the recipe book needs, tagged with the data version", async () => {
    const data = await loadGameData(fakeClient("v7").client);
    expect(data.version).toBe("v7");
    expect(data.recipes.map((r) => r.id)).toContain("smelt_a_gold_bar");
    expect(data.lootTables.map((t) => t.id)).toContain("mining_chest_table");
    expect(data.shops.map((s) => s.id)).toEqual(["granfiddich_tool_stall"]);
  });

  it("loads crafting services with one search, since the recipe book uses no others", async () => {
    const { client, calls } = fakeClient();
    const data = await loadGameData(client);
    expect(calls.paths.filter((path) => path.startsWith("/services/"))).toEqual([
      "/services/search?serviceType=crafting&detailed=true",
    ]);
    expect(data.services.length).toBeGreaterThan(0);
    expect(data.services.every((s) => s.serviceType === "crafting" && s.keywords.length > 0)).toBe(true);
  });

  it("loads pets and keywords", async () => {
    const data = await loadGameData(fakeClient().client);
    expect(data.pets.map((p) => p.id)).toEqual(["mummy"]);
    expect(data.keywords.map((k) => k.id)).toContain("hatchet");
  });

  it("asks for the game ids of gear items only, in one request", async () => {
    const { client, calls } = fakeClient("v1", gearItems);
    const data = await loadGameData(client);
    expect(calls.paths.filter((path) => path === "/items/ids")).toHaveLength(1);
    expect(calls.idRequests).toEqual([["steel_hatchet"]]);
    expect(data.gameIds).toEqual({ steel_hatchet: "a1b2c3d4-0000-4000-8000-000000000002" });
  });

  it("skips the game id request when there's no gear", async () => {
    const { client, calls } = fakeClient();
    await expect(loadGameData(client)).resolves.toMatchObject({ gameIds: {} });
    expect(calls.idRequests).toEqual([]);
  });

  it("still loads, without game ids, when the game id request fails", async () => {
    const { client } = fakeClient("v1", gearItems);
    client.items.ids = async () => {
      throw new Error("down");
    };
    await expect(loadGameData(client)).resolves.toMatchObject({ gameIds: {} });
  });

  it("fails when the API doesn't report a version", async () => {
    const { client } = fakeClient();
    client.version = async () => ({});
    await expect(loadGameData(client)).rejects.toThrow("no version");
  });
});
