import type { ResourceName, VersionInfo } from "./types.js";

/** Base URLs of the WalkScape Data API. Use `dev` while developing; it may change without warning. */
export const ENVIRONMENTS = {
  prod: "https://tools-api.dev.walkscape.app",
  dev: "https://tools-api-dev.dev.walkscape.app",
} as const;

export type Environment = keyof typeof ENVIRONMENTS;

export interface ClientOptions {
  /** Your Data API key. Keys are handed out in the "Walkscape Data API" thread on the WalkScape Discord. */
  apiKey: string;
  /** API base URL. Defaults to `ENVIRONMENTS.prod`. */
  baseUrl?: string;
  /** Locale for translated strings, sent as `Accept-Language`. The API falls back to English. */
  locale?: string;
  /** Custom `fetch`, e.g. for tests. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Retries for rate-limited (429) and server (5xx) responses. Defaults to 3. */
  maxRetries?: number;
}

/** Field filters for `search`, e.g. `{ relatedSkills: "cooking" }`. */
export type SearchParams = Record<string, string | number | boolean>;

/**
 * A WalkScape Data API client. JSON responses are cached by ETag, so repeat requests for
 * unchanged data come back as cheap 304s.
 */
export interface WalkScapeClient {
  /** Current game data version. It changes whenever the game data does, so poll this to know when to reload. */
  version(): Promise<VersionInfo>;
  /** Every entry of a resource, in its compact form (usually `id`, `name`, `icon`). */
  list<T>(resource: ResourceName): Promise<T[]>;
  /** One entry by id, in full. Throws `WalkScapeApiError` with status 404 when it doesn't exist. */
  get<T>(resource: ResourceName, id: string): Promise<T>;
  /**
   * Entries matching every field in `params`. Pass `detailed: true` for full entries instead of the
   * compact form. Throws if `params` is empty, because the API rejects that.
   */
  search<T>(resource: ResourceName, params: SearchParams, options?: { detailed?: boolean }): Promise<T[]>;
  /** One icon image, e.g. `icon(item.icon)`. Read it with `arrayBuffer()` or `blob()`. */
  icon(path: string): Promise<Response>;
  /** Many icons in one request, as data URIs keyed by path (`null` when not found). Send at most 200 paths. */
  icons(paths: string[]): Promise<Record<string, string | null>>;
}

/** Thrown when the API answers with an error status after any retries. */
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

/**
 * Creates a client for the WalkScape Data API.
 *
 * @example
 * const client = createClient({ apiKey: process.env.WALKSCAPE_API_KEY!, baseUrl: ENVIRONMENTS.dev });
 * const items = await client.list<Item>("items");
 */
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
