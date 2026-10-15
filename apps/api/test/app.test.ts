import { describe, expect, it } from "vitest";
import type { RecipeBook } from "@squire/walkscape-sdk";
import { buildApp } from "../src/app.js";
import { fakeClient } from "./fake-client.js";

const app = (client = fakeClient().client, corsOrigins: string[] = []) =>
  buildApp({ client, logLevel: "silent", corsOrigins });

describe("GET /api/recipes", () => {
  it("returns the recipe book with the data version as ETag", async () => {
    const res = await app().inject("/api/recipes");
    expect(res.statusCode).toBe(200);
    expect(res.headers.etag).toBe('"v1"');
    expect(res.json<RecipeBook>().recipes.map((r) => r.id)).toEqual([
      "assemble_dynamite",
      "bake_a_bagel",
      "smelt_a_gold_bar",
    ]);
  });

  it("answers 304 when the client already has this version", async () => {
    const res = await app().inject({ url: "/api/recipes", headers: { "if-none-match": '"v1"' } });
    expect(res.statusCode).toBe(304);
    expect(res.body).toBe("");
  });

  it("answers 502 when the WalkScape API fails", async () => {
    const { client } = fakeClient();
    client.version = async () => {
      throw new (await import("@squire/walkscape-sdk")).WalkScapeApiError(503, "/version", "down");
    };
    const res = await app(client).inject("/api/recipes");
    expect(res.statusCode).toBe(502);
  });
});

describe("compression", () => {
  it.each([
    ["gzip", "gzip"],
    ["br, gzip", "br"],
  ])("compresses the recipe book when the client accepts %s", async (acceptEncoding, expected) => {
    const res = await app().inject({ url: "/api/recipes", headers: { "accept-encoding": acceptEncoding } });
    expect(res.headers["content-encoding"]).toBe(expected);
  });

  it("sends the recipe book uncompressed when the client accepts no encoding", async () => {
    const res = await app().inject("/api/recipes");
    expect(res.headers["content-encoding"]).toBeUndefined();
  });

  it("doesn't compress icons, which are already compressed images", async () => {
    const res = await app().inject({
      url: "/api/icons/assets/icons/items/bagel.png",
      headers: { "accept-encoding": "gzip" },
    });
    expect(res.headers["content-encoding"]).toBeUndefined();
  });
});

describe("GET /api/icons/*", () => {
  it("proxies the icon and caches it in memory", async () => {
    const { client, calls } = fakeClient();
    const server = app(client);
    const first = await server.inject("/api/icons/assets/icons/items/bagel.png");
    await server.inject("/api/icons/assets/icons/items/bagel.png");
    expect(first.statusCode).toBe(200);
    expect(first.headers["content-type"]).toBe("image/png");
    expect(first.headers["cache-control"]).toBe("public, max-age=604800");
    expect(calls.icon).toBe(1);
  });

  it("answers 404 for an unknown icon", async () => {
    const res = await app().inject("/api/icons/assets/missing.png");
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/health", () => {
  it("reports ok", async () => {
    const res = await app().inject("/api/health");
    expect(res.json()).toEqual({ ok: true });
  });
});

describe("CORS", () => {
  it("allows a configured origin", async () => {
    const res = await app(undefined, ["https://squire.example"]).inject({
      url: "/api/health",
      headers: { origin: "https://squire.example" },
    });
    expect(res.headers["access-control-allow-origin"]).toBe("https://squire.example");
  });

  it("sends no CORS headers for other origins", async () => {
    const res = await app(undefined, ["https://squire.example"]).inject({
      url: "/api/health",
      headers: { origin: "https://evil.example" },
    });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("sends no CORS headers when no origins are configured", async () => {
    const res = await app().inject({ url: "/api/health", headers: { origin: "https://squire.example" } });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
