import { brotliDecompressSync, gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { encodeJson, preferredEncoding } from "../src/encoded-json.js";

describe("encodeJson", () => {
  it("produces JSON plus brotli and gzip copies that decode back to it", async () => {
    const value = { recipes: Array.from({ length: 50 }, (_, i) => ({ id: `recipe_${i}`, name: "Smelt a gold bar" })) };
    const encoded = await encodeJson(value);
    const json = JSON.stringify(value);
    expect(encoded.identity.toString()).toBe(json);
    expect(brotliDecompressSync(encoded.br).toString()).toBe(json);
    expect(gunzipSync(encoded.gzip).toString()).toBe(json);
    expect(encoded.br.length).toBeLessThan(encoded.identity.length);
  });
});

describe("preferredEncoding", () => {
  it.each([
    ["br, gzip, deflate", "br"],
    ["gzip, deflate", "gzip"],
    ["gzip;q=1.0, br;q=0.8", "br"],
    ["deflate", "identity"],
    ["", "identity"],
    [undefined, "identity"],
  ])("picks %s → %s", (acceptEncoding, expected) => {
    expect(preferredEncoding(acceptEncoding)).toBe(expected);
  });
});
