import { afterEach, describe, expect, it, vi } from "vitest";
import { ENVIRONMENTS, WalkScapeApiError, createClient, type WalkScapeClient } from "../src/index.js";
import { RESOURCES } from "../src/generated/resources.js";
import { resourceKey } from "../src/resource-keys.js";

type Reply = () => Response;

function fakeFetch(replies: Reply[]) {
  const requests: { url: string; headers: Record<string, string> }[] = [];
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), headers: (init?.headers ?? {}) as Record<string, string> });
    const reply = replies.shift();
    if (!reply) {
      throw new Error("unexpected request");
    }
    return reply();
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, requests };
}

const json =
  (body: unknown, status = 200, headers: Record<string, string> = {}): Reply =>
  () =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

afterEach(() => {
  vi.useRealTimers();
});

describe("createClient", () => {
  it("sends the bearer key to the configured base URL", async () => {
    const { fetch, requests } = fakeFetch([json([])]);
    await createClient({ apiKey: "k", baseUrl: ENVIRONMENTS.dev, fetch }).items.list();
    expect(requests[0]).toEqual({
      url: "https://tools-api-dev.dev.walkscape.app/items/",
      headers: { Authorization: "Bearer k" },
    });
  });

  it("returns the cached body when the server answers 304", async () => {
    const { fetch, requests } = fakeFetch([
      json([{ id: "a" }], 200, { ETag: '"v1"' }),
      () => new Response(null, { status: 304 }),
    ]);
    const client = createClient({ apiKey: "k", fetch });
    await client.items.list();
    await expect(client.items.list()).resolves.toEqual([{ id: "a" }]);
    expect(requests[1]?.headers["If-None-Match"]).toBe('"v1"');
  });

  it("waits for the rate limit reset and retries on 429", async () => {
    vi.useFakeTimers();
    const { fetch } = fakeFetch([
      json({ error: "Too many requests" }, 429, { RateLimit: '"120-in-1min"; r=0; t=2' }),
      json({ version: "x" }),
    ]);
    const pending = createClient({ apiKey: "k", fetch }).version();
    await vi.advanceTimersByTimeAsync(2000);
    await expect(pending).resolves.toEqual({ version: "x" });
  });

  it("backs off normally when the rate limit says it resets in 0 seconds", async () => {
    vi.useFakeTimers();
    const { fetch, requests } = fakeFetch([
      json({ error: "Too many requests" }, 429, { RateLimit: '"120-in-1min"; r=0; t=0' }),
      json({ version: "x" }),
    ]);
    const pending = createClient({ apiKey: "k", fetch }).version();
    await vi.advanceTimersByTimeAsync(499);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ version: "x" });
  });

  it("closes a response's body before retrying it, so its connection is freed", async () => {
    const cancel = vi.fn();
    const { fetch } = fakeFetch([
      () => new Response(new ReadableStream({ cancel }), { status: 503 }),
      json({ version: "x" }),
    ]);
    vi.useFakeTimers();
    const pending = createClient({ apiKey: "k", fetch }).version();
    await vi.advanceTimersByTimeAsync(500);
    await expect(pending).resolves.toEqual({ version: "x" });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("still retries when closing the old response's body fails", async () => {
    const { fetch } = fakeFetch([
      () =>
        new Response(
          new ReadableStream({
            cancel() {
              throw new Error("connection reset");
            },
          }),
          { status: 503 },
        ),
      json({ version: "x" }),
    ]);
    vi.useFakeTimers();
    const pending = createClient({ apiKey: "k", fetch }).version();
    await vi.advanceTimersByTimeAsync(500);
    await expect(pending).resolves.toEqual({ version: "x" });
  });

  it("gives up after maxRetries", async () => {
    const { fetch } = fakeFetch([json({ error: "down" }, 503), json({ error: "down" }, 503)]);
    await expect(createClient({ apiKey: "k", fetch, maxRetries: 1 }).version()).rejects.toMatchObject({ status: 503 });
  });

  it("throws WalkScapeApiError with the API's message on 401", async () => {
    const { fetch } = fakeFetch([json({ error: "Unauthorized" }, 401)]);
    const error = await createClient({ apiKey: "bad", fetch })
      .items.list()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(WalkScapeApiError);
    expect((error as WalkScapeApiError).message).toBe("401 /items/: Unauthorized");
  });

  it("builds detailed searches", async () => {
    const { fetch, requests } = fakeFetch([json([])]);
    await createClient({ apiKey: "k", fetch }).recipes.search({ relatedSkills: "cooking" }, { detailed: true });
    expect(requests[0]?.url).toBe(`${ENVIRONMENTS.prod}/recipes/search?relatedSkills=cooking&detailed=true`);
  });

  it("posts icon paths to the batch endpoint", async () => {
    const { fetch, requests } = fakeFetch([json({ "a.png": "data:image/png;base64,AA==", "b.png": null })]);
    const icons = await createClient({ apiKey: "k", fetch }).icons(["a.png", "b.png"]);
    expect(icons).toEqual({ "a.png": "data:image/png;base64,AA==", "b.png": null });
    expect(requests[0]?.url).toBe(`${ENVIRONMENTS.prod}/icons/batch`);
    expect(requests[0]?.headers["Content-Type"]).toBe("application/json");
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: "POST", body: JSON.stringify({ iconPaths: ["a.png", "b.png"] }) }),
    );
  });

  it.each([
    { to: "game" as const, body: { ids: ["oven_mittens"], target: "base" } },
    { to: "api" as const, body: { ids: ["oven_mittens"] } },
  ])("posts item ids to convert them to $to ids", async ({ to, body }) => {
    const { fetch, requests } = fakeFetch([json({ oven_mittens: "item-oven_mittens-de8dce30" })]);
    const ids = await createClient({ apiKey: "k", fetch }).items.ids(["oven_mittens"], to);
    expect(ids).toEqual({ oven_mittens: "item-oven_mittens-de8dce30" });
    expect(requests[0]?.url).toBe(`${ENVIRONMENTS.prod}/items/ids`);
    expect(requests[0]?.headers["Content-Type"]).toBe("application/json");
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: "POST", body: JSON.stringify(body) }),
    );
  });

  it("throws the API's error when item ids are rejected", async () => {
    const { fetch } = fakeFetch([json({ error: "ids must be an array" }, 400)]);
    await expect(createClient({ apiKey: "k", fetch }).items.ids([], "game")).rejects.toThrow(
      "400 /items/ids: ids must be an array",
    );
  });

  it("rejects a search with no filters", async () => {
    const { fetch } = fakeFetch([]);
    await expect(createClient({ apiKey: "k", fetch }).recipes.search({})).rejects.toThrow("needs at least one filter");
  });

  it("skips filters left undefined", async () => {
    const { fetch, requests } = fakeFetch([json([])]);
    const client = createClient({ apiKey: "k", fetch });
    await client.items.search({ type: "material", quality: undefined });
    expect(requests[0]?.url).toBe(`${ENVIRONMENTS.prod}/items/search?type=material`);
    await expect(client.items.search({ type: undefined })).rejects.toThrow("needs at least one filter");
  });

  it("sends true/false filters as strings", async () => {
    const { fetch, requests } = fakeFetch([json([])]);
    await createClient({ apiKey: "k", fetch }).items.search({ canBeSold: false, type: "material" });
    expect(requests[0]?.url).toBe(`${ENVIRONMENTS.prod}/items/search?canBeSold=false&type=material`);
  });

  it("has a camelCase namespace for every resource, with search only where the API has filters and ids only on items", () => {
    const client = createClient({ apiKey: "k", fetch: fakeFetch([]).fetch }) as unknown as Record<
      string,
      Record<string, unknown>
    >;
    const unsearchable = ["globalVariables", "jobBoards", "pets", "pfpOptionGroups", "routePaths", "terrainModifiers"];
    const namespaces = [
      ...["abilities", "achievements", "activities", "buildings", "cooldowns", "factions", "items", "keywords"],
      ...["locations", "lootTables", "pfpOptions", "recipes", "rewards", "routes", "services", "shops", "skills"],
      ...["stats", ...unsearchable],
    ];
    expect(namespaces).toHaveLength(RESOURCES.length);
    for (const key of namespaces) {
      const methods = unsearchable.includes(key) ? ["get", "list", "loadAll"] : ["get", "list", "loadAll", "search"];
      expect(Object.keys(client[key] ?? {}).sort(), key).toEqual(
        key === "items" ? [...methods, "ids"].sort() : methods,
      );
    }
  });

  it.each([
    ["items", "items"],
    ["loot_tables", "lootTables"],
    ["pfp_option_groups", "pfpOptionGroups"],
  ] as const)("names %s as %s", (resource, key) => {
    expect(resourceKey(resource)).toBe(key);
  });

  it("names multi-word resources in camelCase and calls their snake_case paths", async () => {
    const { fetch, requests } = fakeFetch([json([])]);
    await createClient({ apiKey: "k", fetch }).lootTables.list();
    expect(requests[0]?.url).toBe(`${ENVIRONMENTS.prod}/loot_tables/`);
  });

  it("loads a whole resource through loadAll", async () => {
    const { fetch, requests } = fakeFetch([json([{ id: "mining", name: "Mining" }])]);
    const skills = await createClient({ apiKey: "k", fetch }).skills.loadAll();
    expect(skills).toEqual([{ id: "mining", name: "Mining" }]);
    expect(requests.map((r) => r.url)).toEqual([`${ENVIRONMENTS.prod}/skills/`]);
  });

  it.each([
    ["version", (c: WalkScapeClient) => c.version(), "/version/"],
    ["health", (c: WalkScapeClient) => c.health(), "/health/"],
    ["get", (c: WalkScapeClient) => c.items.get("gold ore"), "/items/id/gold%20ore"],
    ["maps", (c: WalkScapeClient) => c.maps(), "/maps"],
    ["map", (c: WalkScapeClient) => c.map("world map.png"), "/maps/world%20map.png"],
  ])("calls the documented path for %s", async (_name, call, path) => {
    const { fetch, requests } = fakeFetch([json({})]);
    await call(createClient({ apiKey: "k", fetch }));
    expect(requests[0]?.url).toBe(`${ENVIRONMENTS.prod}${path}`);
  });
});
