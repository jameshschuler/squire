import type { ResourceName, VersionInfo } from "./types.js";

export const ENVIRONMENTS = {
  prod: "https://tools-api.dev.walkscape.app",
  dev: "https://tools-api-dev.dev.walkscape.app",
} as const;

export type Environment = keyof typeof ENVIRONMENTS;

export interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
  locale?: string;
  fetch?: typeof fetch;
  maxRetries?: number;
}

export type SearchParams = Record<string, string | number | boolean>;

export interface WalkScapeClient {
  version(): Promise<VersionInfo>;
  list<T>(resource: ResourceName): Promise<T[]>;
  get<T>(resource: ResourceName, id: string): Promise<T>;
  search<T>(resource: ResourceName, params: SearchParams, options?: { detailed?: boolean }): Promise<T[]>;
  icon(path: string): Promise<Response>;
  icons(paths: string[]): Promise<Record<string, string | null>>;
}

export class WalkScapeApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(`${status} ${path}: ${message}`);
    this.name = "WalkScapeApiError";
  }
}

interface SendOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

interface CacheEntry {
  etag: string;
  body: unknown;
}

export function createClient(options: ClientOptions): WalkScapeClient {
  const baseUrl = (options.baseUrl ?? ENVIRONMENTS.prod).replace(/\/+$/, "");
  const fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
  const maxRetries = options.maxRetries ?? 3;
  const cache = new Map<string, CacheEntry>();

  const headers = (extra: Record<string, string> = {}): Record<string, string> => ({
    Authorization: `Bearer ${options.apiKey}`,
    ...(options.locale ? { "Accept-Language": options.locale } : {}),
    ...extra,
  });

  async function send(path: string, request: SendOptions = {}): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const res = await fetchFn(`${baseUrl}${path}`, { ...request, headers: headers(request.headers) });
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        await sleep(retryDelayMs(res, attempt));
        continue;
      }
      if (!res.ok && res.status !== 304) {
        throw new WalkScapeApiError(res.status, path, await errorMessage(res));
      }
      return res;
    }
  }

  async function getJson<T>(path: string): Promise<T> {
    const cached = cache.get(path);
    const res = await send(path, cached ? { headers: { "If-None-Match": cached.etag } } : {});
    if (res.status === 304 && cached) {
      return cached.body as T;
    }
    const body = (await res.json()) as T;
    const etag = res.headers.get("ETag");
    if (etag) {
      cache.set(path, { etag, body });
    }
    return body;
  }

  return {
    version: () => getJson("/version"),
    list: (resource) => getJson(`/${resource}`),
    get: (resource, id) => getJson(`/${resource}/${encodeURIComponent(id)}`),
    search: (resource, params, { detailed = false } = {}) => {
      const query = new URLSearchParams(Object.entries(params).map(([k, v]): [string, string] => [k, String(v)]));
      if (query.size === 0) {
        throw new Error(`search(${resource}) needs at least one parameter`);
      }
      if (detailed) {
        query.set("detailed", "true");
      }
      return getJson(`/${resource}/search?${query}`);
    },
    icon: (path) => send(`/icons/${path.split("/").map(encodeURIComponent).join("/")}`),
    icons: async (paths) => {
      const res = await send("/icons/batch", {
        method: "POST",
        body: JSON.stringify({ iconPaths: paths }),
        headers: { "Content-Type": "application/json" },
      });
      return (await res.json()) as Record<string, string | null>;
    },
  };
}

function retryDelayMs(res: Response, attempt: number): number {
  const retryAfter = Number(res.headers.get("Retry-After"));
  if (retryAfter > 0) {
    return retryAfter * 1000;
  }
  const reset = /\bt=(\d+)/.exec(res.headers.get("RateLimit") ?? "")?.[1];
  if (res.status === 429 && reset) {
    return Number(reset) * 1000;
  }
  return 500 * 2 ** attempt;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
