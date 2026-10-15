import { afterEach, describe, expect, it, vi } from "vitest";
import { ENVIRONMENTS, WalkScapeApiError, createClient } from "../src/index.js";

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
      url: "https://tools-api-dev.dev.walkscape.app/items",
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
    expect(await client.list("items")).toEqual([{ id: "a" }]);
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
    expect((error as WalkScapeApiError).message).toBe("401 /items: Unauthorized");
  });

  it("builds detailed searches", async () => {
    const { fetch, requests } = fakeFetch([json([])]);
    await createClient({ apiKey: "k", fetch }).search("recipes", { relatedSkills: "cooking" }, { detailed: true });
    expect(requests[0]?.url).toBe(`${ENVIRONMENTS.prod}/recipes/search?relatedSkills=cooking&detailed=true`);
  });

  it("rejects a search with no parameters", () => {
    const { fetch } = fakeFetch([]);
    expect(() => createClient({ apiKey: "k", fetch }).search("recipes", {})).toThrow("needs at least one parameter");
  });
});
