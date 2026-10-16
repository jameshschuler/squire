import { describe, expect, it, vi } from "vitest";
import { loadAll, loadGameData, type ResourceName, type WalkScapeClient } from "../src/index.js";

type Entry = { id: string; full: boolean; canBeSold?: boolean };

function fakeClient(entries: Partial<Record<ResourceName, Entry[]>>) {
  const list = vi.fn(async (resource: ResourceName) => (entries[resource] ?? []).map(({ id }) => ({ id })));
  const get = vi.fn(async (resource: ResourceName, id: string) => entries[resource]!.find((e) => e.id === id));
  const search = vi.fn(async (resource: ResourceName, filters: Record<string, unknown>) =>
    (entries[resource] ?? []).filter((e) =>
      Object.entries(filters).every(([k, v]) => String(e[k as keyof Entry]) === String(v)),
    ),
  );
  const client = {
    list,
    get,
    search,
    version: async () => ({ version: "v1" }),
  } as unknown as WalkScapeClient;
  return { client, list, get, search };
}

describe("loadAll", () => {
  it("loads a resource with bulk searches over every value of its filter", async () => {
    const { client, search, get } = fakeClient({
      items: [
        { id: "ore", full: true, canBeSold: true },
        { id: "token", full: true, canBeSold: false },
      ],
    });
    expect(await loadAll(client, "items")).toEqual([
      { id: "ore", full: true, canBeSold: true },
      { id: "token", full: true, canBeSold: false },
    ]);
    expect(search.mock.calls).toEqual([
      ["items", { canBeSold: "true" }, { detailed: true }],
      ["items", { canBeSold: "false" }, { detailed: true }],
    ]);
    expect(get).not.toHaveBeenCalled();
  });

  it("fetches entries the bulk searches missed one at a time", async () => {
    const { client, get } = fakeClient({
      items: [
        { id: "ore", full: true, canBeSold: true },
        { id: "odd", full: true },
      ],
    });
    expect((await loadAll(client, "items")).map((e) => e.id)).toEqual(["ore", "odd"]);
    expect(get.mock.calls).toEqual([["items", "odd"]]);
  });

  it("fetches every entry one at a time for a resource without a search filter", async () => {
    const { client, search, get } = fakeClient({
      pets: [
        { id: "cat", full: true },
        { id: "dog", full: true },
      ],
    });
    expect(await loadAll(client, "pets")).toEqual([
      { id: "cat", full: true },
      { id: "dog", full: true },
    ]);
    expect(search).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("returns nothing for an empty resource", async () => {
    const { client } = fakeClient({});
    expect(await loadAll(client, "pets")).toEqual([]);
  });
});

describe("loadGameData", () => {
  it("tags every resource it loads with the data version", async () => {
    const { client } = fakeClient({ shops: [{ id: "stall", full: true }] });
    const data = await loadGameData(client);
    expect(data.version).toBe("v1");
    expect(data.shops).toEqual([{ id: "stall", full: true }]);
    expect(data.recipes).toEqual([]);
  });
});
