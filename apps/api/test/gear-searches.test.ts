import { Writable } from "node:stream";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { gearSearchRoutes } from "../src/routes/gear-searches.js";

const finished = {
  target: "venture_into_the_hideout",
  kind: "activity",
  location: null,
  goals: ["steps", "xp"],
  recommended: false,
  withCharacter: true,
  bookVersion: "v1",
  failed: false,
  searchMs: 50_213,
  proven: false,
  margin: { goal: "steps", gap: 0.4 },
};

const crashed = { ...finished, failed: true, searchMs: null, proven: null, margin: null };

function server() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      done();
    },
  });
  const app = Fastify({ logger: { level: "info", stream } });

  app.register(gearSearchRoutes);

  const post = (payload: object) => app.inject({ method: "POST", url: "/api/gear-searches", payload });
  const logged = () => lines.filter((line) => line.msg === "Gear search").map((line) => line.gearSearch);

  return { post, logged };
}

describe("POST /api/gear-searches", () => {
  it.each([
    ["a finished search", finished],
    ["a search that crashed", crashed],
    ["a proven search", { ...finished, proven: true, margin: null }],
  ])("logs %s and answers 204", async (_, body) => {
    const { post, logged } = server();
    const res = await post(body);

    expect(res.statusCode).toBe(204);
    expect(logged()).toEqual([body]);
  });

  it("drops fields it doesn't know instead of logging them", async () => {
    const { post, logged } = server();

    await post({ ...finished, characterName: "Test Walker" });
    expect(logged()).toEqual([finished]);
  });

  it.each([
    ["a missing field", { ...finished, searchMs: undefined }],
    ["an unknown goal", { ...finished, goals: ["steps", "luck"] }],
    ["an unknown kind", { ...finished, kind: "shop" }],
    ["a target that's too long", { ...finished, target: "x".repeat(101) }],
    ["free text in place of an id", { ...finished, location: "Walked past my house on Elm St" }],
    ["a negative search time", { ...finished, searchMs: -1 }],
    ["a margin with extra parts", { ...finished, margin: { goal: "steps" } }],
  ])("rejects %s without logging", async (_, body) => {
    const { post, logged } = server();
    const res = await post(body);

    expect(res.statusCode).toBe(400);
    expect(logged()).toEqual([]);
  });

  it("rejects a body over the size limit", async () => {
    const { post, logged } = server();
    const res = await post({ ...finished, padding: "x".repeat(4096) });

    expect(res.statusCode).toBe(413);
    expect(logged()).toEqual([]);
  });
});
