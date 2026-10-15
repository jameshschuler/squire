import { describe, expect, it } from "vitest";
import { ENVIRONMENTS } from "@squire/walkscape-sdk";
import { readEnv } from "../src/env.js";

describe("readEnv", () => {
  it("defaults to prod on port 3000 with info logs and no CORS", () => {
    expect(readEnv({ WALKSCAPE_API_KEY: "k" })).toEqual({
      apiKey: "k",
      baseUrl: ENVIRONMENTS.prod,
      port: 3000,
      logLevel: "info",
      corsOrigins: [],
    });
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
