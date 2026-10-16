import { afterEach, describe, expect, it, vi } from "vitest";
import { ENVIRONMENTS, WalkScapeApiError, createClient, type WalkScapeClient } from "../src/index.js";

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
    await createClient({ apiKey: "k", baseUrl: ENVIRONMENTS.dev, fetch }).list("items");
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
    await client.list("items");
    await expect(client.list("items")).resolves.toEqual([{ id: "a" }]);
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

  it("gives up after maxRetries", async () => {
    const { fetch } = fakeFetch([json({ error: "down" }, 503), json({ error: "down" }, 503)]);
    await expect(createClient({ apiKey: "k", fetch, maxRetries: 1 }).version()).rejects.toMatchObject({ status: 503 });
  });

  it("throws WalkScapeApiError with the API's message on 401", async () => {
    const { fetch } = fakeFetch([json({ error: "Unauthorized" }, 401)]);
    const error = await createClient({ apiKey: "bad", fetch })
      .list("items")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(WalkScapeApiError);
    expect((error as WalkScapeApiError).message).toBe("401 /items/: Unauthorized");
  });

  it("builds detailed searches", async () => {
    const { fetch, requests } = fakeFetch([json([])]);
    await createClient({ apiKey: "k", fetch }).search("recipes", { relatedSkills: "cooking" }, { detailed: true });
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

  it("rejects a search with no filters", () => {
    const { fetch } = fakeFetch([]);
    expect(() => createClient({ apiKey: "k", fetch }).search("recipes", {})).toThrow("needs at least one filter");
  });

  it("skips filters left undefined", async () => {
    const { fetch, requests } = fakeFetch([json([])]);
    const client = createClient({ apiKey: "k", fetch });
    await client.search("items", { type: "material", quality: undefined });
    expect(requests[0]?.url).toBe(`${ENVIRONMENTS.prod}/items/search?type=material`);
    expect(() => client.search("items", { type: undefined })).toThrow("needs at least one filter");
  });

  it("sends true/false filters as strings", async () => {
    const { fetch, requests } = fakeFetch([json([])]);
    await createClient({ apiKey: "k", fetch }).search("items", { canBeSold: false, type: "material" });
    expect(requests[0]?.url).toBe(`${ENVIRONMENTS.prod}/items/search?canBeSold=false&type=material`);
  });

  it.each([
    ["version", (c: WalkScapeClient) => c.version(), "/version/"],
    ["health", (c: WalkScapeClient) => c.health(), "/health/"],
    ["get", (c: WalkScapeClient) => c.get("items", "gold ore"), "/items/id/gold%20ore"],
    ["maps", (c: WalkScapeClient) => c.maps(), "/maps"],
    ["map", (c: WalkScapeClient) => c.map("world map.png"), "/maps/world%20map.png"],
  ])("calls the documented path for %s", async (_name, call, path) => {
    const { fetch, requests } = fakeFetch([json({})]);
    await call(createClient({ apiKey: "k", fetch }));
    expect(requests[0]?.url).toBe(`${ENVIRONMENTS.prod}${path}`);
  });
});
