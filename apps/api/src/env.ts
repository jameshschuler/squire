import { ENVIRONMENTS, type Environment } from "@squire/walkscape-sdk";

export interface Env {
  apiKey: string;
  baseUrl: string;
  port: number;
  logLevel: string;
  corsOrigins: string[];
}

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const apiKey = source.WALKSCAPE_API_KEY;
  if (!apiKey) {
    throw new Error("WALKSCAPE_API_KEY is not set");
  }
  const environment = (source.WALKSCAPE_ENV ?? "prod") as Environment;
  if (!(environment in ENVIRONMENTS)) {
    throw new Error(`WALKSCAPE_ENV must be one of: ${Object.keys(ENVIRONMENTS).join(", ")}`);
  }
  return {
    apiKey,
    baseUrl: ENVIRONMENTS[environment],
    port: Number(source.PORT ?? 3000),
    logLevel: source.LOG_LEVEL ?? "info",
    corsOrigins: (source.CORS_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean),
  };
}
