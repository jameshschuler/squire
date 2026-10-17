import { createClient } from "@jameshschuler/walkscape-data-client";
import { HTTP_STATUS } from "../src/http-status.js";
import type { GameData } from "../src/recipe-book/index.js";
import sample from "../../../fixtures/api/gamedata-sample.json";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export function fakeClient(version = "v1") {
  const data = sample as unknown as GameData;
  const resources: Record<string, Record<string, unknown>[]> = {
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
  const calls = { version: 0, lists: 0, icon: 0, iconBatches: [] as number[], paths: [] as string[] };
  const state = { version };

  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.paths.push(url.pathname + url.search);
    if (url.pathname === "/version/") {
      calls.version++;
      return json({ version: state.version, details: { api: "", assets: "", locales: "" } });
    }
    if (url.pathname === "/icons/batch") {
      const { iconPaths } = JSON.parse(String(init?.body)) as { iconPaths: string[] };
      calls.iconBatches.push(iconPaths.length);
      return json(
        Object.fromEntries(
          iconPaths.map((p) => [
            p,
            p.includes("missing") || p.includes("unbatched") ? null : "data:image/webp;base64,AQID",
          ]),
        ),
      );
    }
    if (url.pathname.startsWith("/icons/")) {
      calls.icon++;
      if (url.pathname.includes("missing")) {
        return json({ error: "Not found" }, HTTP_STATUS.NOT_FOUND);
      }
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "image/png" } });
    }
    const [, resource = "", endpoint, id] = url.pathname.split("/");
    const entries = resources[resource];
    if (!entries) {
      return json({ error: "Not found" }, HTTP_STATUS.NOT_FOUND);
    }
    if (endpoint === "") {
      calls.lists++;
      return json(entries);
    }
    if (endpoint === "id") {
      const found = entries.find((entry) => entry.id === decodeURIComponent(id ?? ""));
      return found ? json(found) : json({ error: "Not found" }, HTTP_STATUS.NOT_FOUND);
    }
    const filters = [...url.searchParams].filter(([field]) => field !== "detailed");
    const found = entries.filter((entry) => filters.every(([field, value]) => matches(entry[field], value)));
    const detailed = url.searchParams.get("detailed") === "true";
    return json(detailed ? found : found.map(({ id, name, icon }) => ({ id, name, icon })));
  };

  const client = createClient({ apiKey: "test", fetch, maxRetries: 0 });
  return { client, calls, state };
}

function matches(actual: unknown, value: string): boolean {
  return Array.isArray(actual) ? actual.includes(value) : String(actual) === value;
}
