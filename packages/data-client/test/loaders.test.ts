import { describe, expect, it, vi } from "vitest";
import type { ApiResource } from "../src/api-resources.js";
import { loadAllEntries, type Endpoints } from "../src/loaders.js";

type Entry = { id: string; full: boolean; canBeSold?: boolean; relatedSkills?: string[] };

function fakeClient(entries: Partial<Record<ApiResource, Entry[]>>) {
  const list = vi.fn(async (resource: ApiResource) => (entries[resource] ?? []).map(({ id }) => ({ id })));
  const get = vi.fn(async (resource: ApiResource, id: string) => entries[resource]!.find((e) => e.id === id));
  const search = vi.fn(async (resource: ApiResource, filters: Record<string, unknown>) =>
    (entries[resource] ?? []).filter((e) =>
      Object.entries(filters).every(([k, v]) => {
        const actual = e[k as keyof Entry];
        return Array.isArray(actual) ? actual.includes(v as string) : actual === v;
      }),
    ),
  );
  const client: Endpoints = { list, get, search };
  return { client, list, get, search };
}

describe("loadAllEntries", () => {
  it("loads a resource with bulk searches over every value of its filter", async () => {
    const { client, search, get } = fakeClient({
      items: [
        { id: "ore", full: true, canBeSold: true },
        { id: "token", full: true, canBeSold: false },
      ],
    });
    await expect(loadAllEntries(client, "items")).resolves.toEqual([
      { id: "ore", full: true, canBeSold: true },
      { id: "token", full: true, canBeSold: false },
    ]);
    expect(search.mock.calls).toEqual([
      ["items", { canBeSold: true }, true],
      ["items", { canBeSold: false }, true],
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
    const items = (await loadAllEntries(client, "items")) as Entry[];
    expect(items.map((e) => e.id)).toEqual(["ore", "odd"]);
    expect(get.mock.calls).toEqual([["items", "odd"]]);
  });

  it("returns each entry once when the list repeats an id the bulk search found", async () => {
    const { client, list, get } = fakeClient({ items: [{ id: "ore", full: true, canBeSold: true }] });
    list.mockResolvedValueOnce([{ id: "ore" }, { id: "ore" }]);
    await expect(loadAllEntries(client, "items")).resolves.toEqual([{ id: "ore", full: true, canBeSold: true }]);
    expect(get).not.toHaveBeenCalled();
  });

  it("fetches an id the list repeats only once", async () => {
    const { client, list, get } = fakeClient({ pets: [{ id: "cat", full: true }] });
    list.mockResolvedValueOnce([{ id: "cat" }, { id: "cat" }]);
    await loadAllEntries(client, "pets");
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("fetches every entry one at a time for a resource without a search filter", async () => {
    const { client, search, get } = fakeClient({
      pets: [
        { id: "cat", full: true },
        { id: "dog", full: true },
      ],
    });
    await expect(loadAllEntries(client, "pets")).resolves.toEqual([
      { id: "cat", full: true },
      { id: "dog", full: true },
    ]);
    expect(search).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("takes a resource whose list already holds full entries from the list alone", async () => {
    const { client, search, get } = fakeClient({ skills: [{ id: "mining", full: true }] });
    await expect(loadAllEntries(client, "skills")).resolves.toEqual([{ id: "mining" }]);
    expect(search).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it("returns nothing for an empty resource", async () => {
    const { client } = fakeClient({});
    await expect(loadAllEntries(client, "pets")).resolves.toEqual([]);
  });
});
