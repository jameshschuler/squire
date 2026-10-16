import { HTTP_STATUS } from "./http-status.js";
import type {
  Detail,
  Health,
  ListItem,
  MapList,
  ResourceName,
  SearchFilters,
  SearchableResource,
  VersionInfo,
} from "./types.js";

const RETRY_BASE_DELAY_MS = 500;

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

/**
 * A WalkScape Data API client. JSON responses are cached by ETag, so repeat requests for
 * unchanged data come back as cheap 304s.
 */
export interface WalkScapeClient {
  /** Current game data version. It changes whenever the game data does, so poll this to know when to reload. */
  version(): Promise<VersionInfo>;
  /** Server status and uptime. */
  health(): Promise<Health>;
  /** Every entry of a resource, in its compact form (usually `id`, `name`, `icon`). */
  list<R extends ResourceName>(resource: R): Promise<ListItem<R>[]>;
  /** One entry by id, in full. Throws `WalkScapeApiError` with status 404 when it doesn't exist. */
  get<R extends ResourceName>(resource: R, id: string): Promise<Detail<R>>;
  /**
   * Entries matching every filter, in compact form. Throws if `filters` is empty, because the API
   * rejects that.
   */
  search<R extends SearchableResource>(
    resource: R,
    filters: SearchFilters<R>,
    options?: { detailed?: false },
  ): Promise<ListItem<R>[]>;
  /** Entries matching every filter, in full. */
  search<R extends SearchableResource>(
    resource: R,
    filters: SearchFilters<R>,
    options: { detailed: true },
  ): Promise<Detail<R>[]>;
  /** The map images available from `map(name)`, with their sizes. */
  maps(): Promise<MapList>;
  /** One map image, e.g. `map("worldmap.png")`. Read it with `arrayBuffer()` or `blob()`. */
  map(name: string): Promise<Response>;
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
 * const items = await client.list("items");
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
      if (
        (res.status === HTTP_STATUS.TOO_MANY_REQUESTS || res.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) &&
        attempt < maxRetries
      ) {
        await sleep(retryDelayMs(res, attempt));
        continue;
      }
      if (!res.ok && res.status !== HTTP_STATUS.NOT_MODIFIED) {
        const message = await errorMessage(res);
        throw new WalkScapeApiError(res.status, path, message);
      }
      return res;
    }
  }

  async function getJson<T>(path: string): Promise<T> {
    const cached = cache.get(path);
    const res = await send(path, cached ? { headers: { "If-None-Match": cached.etag } } : {});
    if (res.status === HTTP_STATUS.NOT_MODIFIED && cached) {
      return cached.body as T;
    }
    const body = (await res.json()) as T;
    const etag = res.headers.get("ETag");
    if (etag) {
      cache.set(path, { etag, body });
    }
    return body;
  }

  const search = (resource: string, filters: object, { detailed = false } = {}) => {
    const query = new URLSearchParams(
      Object.entries(filters).flatMap(([k, v]): [string, string][] => (v === undefined ? [] : [[k, String(v)]])),
    );
    if (query.size === 0) {
      throw new Error(`search(${resource}) needs at least one filter`);
    }
    if (detailed) {
      query.set("detailed", "true");
    }
    return getJson(`/${resource}/search?${query}`);
  };

  return {
    version: () => getJson("/version/"),
    health: () => getJson("/health/"),
    list: (resource) => getJson(`/${resource}/`),
    get: (resource, id) => getJson(`/${resource}/id/${encodeURIComponent(id)}`),
    search: search as WalkScapeClient["search"],
    maps: () => getJson("/maps"),
    map: (name) => send(`/maps/${encodeURIComponent(name)}`),
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
  if (res.status === HTTP_STATUS.TOO_MANY_REQUESTS && reset) {
    return Number(reset) * 1000;
  }
  return RETRY_BASE_DELAY_MS * 2 ** attempt;
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
