import { describe, expect, it } from "vitest";
import { createIconStore } from "../src/icons.js";
import { fakeClient } from "./fake-client.js";

const paths = (count: number) => Array.from({ length: count }, (_, i) => `icons/${i}.png`);

describe("createIconStore", () => {
  it("warms icons in batches of 200", async () => {
    const { client, calls } = fakeClient();
    const loaded = await createIconStore(client).warm(paths(450));
    expect(calls.iconBatches).toEqual([200, 200, 50]);
    expect(loaded).toBe(450);
  });

  it("serves warmed icons from memory, decoded from their data URI", async () => {
    const { client, calls } = fakeClient();
    const icons = createIconStore(client);
    await icons.warm(["icons/a.png"]);
    const icon = await icons.get("icons/a.png");
    expect(icon).toEqual({ type: "image/webp", body: Buffer.from([1, 2, 3]) });
    expect(calls.icon).toBe(0);
  });

  it("only requests icons it doesn't have yet", async () => {
    const { client, calls } = fakeClient();
    const icons = createIconStore(client);
    await icons.warm(["icons/a.png"]);
    await icons.warm(["icons/a.png", "icons/b.png"]);
    expect(calls.iconBatches).toEqual([1, 1]);
  });

  it("skips icons the batch endpoint doesn't have, and fetches them one by one on request", async () => {
    const { client, calls } = fakeClient();
    const icons = createIconStore(client);
    await expect(icons.warm(["icons/missing.png", "icons/a.png"])).resolves.toBe(1);
    await expect(icons.get("icons/missing.png")).rejects.toMatchObject({ status: 404 });
    expect(calls.icon).toBe(1);
  });

  it("caches an icon it had to fetch on its own", async () => {
    const { client, calls } = fakeClient();
    const icons = createIconStore(client);
    await icons.warm(["icons/unbatched.png"]);
    await icons.get("icons/unbatched.png");
    await icons.get("icons/unbatched.png");
    expect(calls.icon).toBe(1);
  });

  it("returns nothing for an icon the recipe book doesn't use, without asking WalkScape", async () => {
    const { client, calls } = fakeClient();
    const icons = createIconStore(client);
    await icons.warm(["icons/a.png"]);
    await expect(icons.get("icons/other.png")).resolves.toBeUndefined();
    expect(calls.icon).toBe(0);
  });

  it("does nothing when there is nothing to warm", async () => {
    const { client, calls } = fakeClient();
    await expect(createIconStore(client).warm([])).resolves.toBe(0);
    expect(calls.iconBatches).toEqual([]);
  });
});
