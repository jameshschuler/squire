import { WalkScapeApiError, type ResourceName, type WalkScapeClient } from "@jameshschuler/walkscape-sdk";
import type { GameData } from "../src/recipe-book/index.js";
import sample from "../../../fixtures/api/gamedata-sample.json";

export function fakeClient(version = "v1") {
  const data = sample as unknown as GameData;
  const resources: Partial<Record<ResourceName, { id: string }[]>> = {
    skills: data.skills,
    items: data.items,
    services: data.services,
    recipes: data.recipes,
    locations: data.locations,
    factions: data.factions,
    activities: data.activities,
    loot_tables: data.lootTables,
    shops: data.shops,
  };
  const calls = { version: 0, loadAll: 0, icon: 0, iconBatches: [] as number[] };
  const state = { version };

  const client: WalkScapeClient = {
    version: async () => {
      calls.version++;
      return { version: state.version, details: { api: "", assets: "", locales: "" } };
    },
    health: async () => ({ status: "ok", uptime: 1 }),
    list: async (resource) => (resources[resource] ?? []) as never,
    get: async (resource, id) => {
      const found = resources[resource]?.find((r) => r.id === id);
      if (!found) {
        throw new WalkScapeApiError(404, `/${resource}/id/${id}`, "Not found");
      }
      return found as never;
    },
    search: (async (resource: ResourceName, filters: Record<string, unknown>) =>
      (resources[resource] ?? []).filter((entry) =>
        Object.entries(filters).every(([field, value]) => {
          const actual = (entry as Record<string, unknown>)[field];
          return Array.isArray(actual) ? actual.includes(value) : actual === value;
        }),
      )) as WalkScapeClient["search"],
    loadAll: async (resource) => {
      calls.loadAll++;
      return (resources[resource] ?? []) as never;
    },
    maps: async () => ({ maps: [] }),
    map: async () => new Response(new Uint8Array([1])),
    icon: async (path) => {
      calls.icon++;
      if (path.includes("missing")) {
        throw new WalkScapeApiError(404, `/icons/${path}`, "Not found");
      }
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "image/png" } });
    },
    icons: async (paths) => {
      calls.iconBatches.push(paths.length);
      return Object.fromEntries(paths.map((p) => [p, p.includes("missing") ? null : "data:image/webp;base64,AQID"]));
    },
  };
  return { client, calls, state };
}
