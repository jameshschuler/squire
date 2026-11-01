import { describe, expect, it } from "vitest";
import { ENVIRONMENTS } from "@walkscape-community/data-api-client";
import { DEFAULT_GAME_DATA_CACHE_PATH } from "../src/game-data-cache.js";
import { readEnv } from "../src/env.js";

describe("readEnv", () => {
  it("defaults to prod on port 3000 with info logs and no CORS", () => {
    expect(readEnv({ WALKSCAPE_API_KEY: "k" })).toEqual({
      apiKey: "k",
      baseUrl: ENVIRONMENTS.prod,
      port: 3000,
      logLevel: "info",
      corsOrigins: [],
      gameDataCachePath: DEFAULT_GAME_DATA_CACHE_PATH,
    });
  });

  it("uses the default cache path when GAME_DATA_CACHE_PATH is set but empty, as in .env.example", () => {
    expect(readEnv({ WALKSCAPE_API_KEY: "k", GAME_DATA_CACHE_PATH: "" }).gameDataCachePath).toBe(
      DEFAULT_GAME_DATA_CACHE_PATH,
    );
  });

  it("saves game data where GAME_DATA_CACHE_PATH says", () => {
    expect(readEnv({ WALKSCAPE_API_KEY: "k", GAME_DATA_CACHE_PATH: "/var/data/game.json" }).gameDataCachePath).toBe(
      "/var/data/game.json",
    );
  });

  it("uses the dev environment and port when set", () => {
    expect(readEnv({ WALKSCAPE_API_KEY: "k", WALKSCAPE_ENV: "dev", PORT: "4000" })).toMatchObject({
      baseUrl: ENVIRONMENTS.dev,
      port: 4000,
    });
  });

  it("reads the log level and a comma-separated list of CORS origins", () => {
    expect(
      readEnv({ WALKSCAPE_API_KEY: "k", LOG_LEVEL: "debug", CORS_ORIGINS: "https://a.example, https://b.example," }),
    ).toMatchObject({
      logLevel: "debug",
      corsOrigins: ["https://a.example", "https://b.example"],
    });
  });

  it("requires the API key", () => {
    expect(() => readEnv({})).toThrow("WALKSCAPE_API_KEY is not set");
  });

  it("rejects an unknown environment", () => {
    expect(() => readEnv({ WALKSCAPE_API_KEY: "k", WALKSCAPE_ENV: "staging" })).toThrow("WALKSCAPE_ENV must be one of");
  });
});
