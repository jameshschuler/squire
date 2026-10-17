import type { WalkScapeClient } from "@jameshschuler/walkscape-data-client";

const BATCH_SIZE = 200;

export interface Icon {
  type: string;
  body: Buffer;
}

export interface IconStore {
  hasKnownIcons(): boolean;
  get(path: string): Promise<Icon | undefined>;
  warm(paths: string[]): Promise<number>;
}

export function createIconStore(client: WalkScapeClient): IconStore {
  const icons = new Map<string, Icon>();
  const fetching = new Map<string, Promise<Icon>>();
  let known: Set<string> | undefined;
  let warming: Promise<unknown> = Promise.resolve();

  async function loadBatches(paths: string[]): Promise<number> {
    const missing = paths.filter((path) => !icons.has(path));
    let loaded = 0;
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = await client.icons(missing.slice(i, i + BATCH_SIZE));
      for (const [path, dataUri] of Object.entries(batch)) {
        if (dataUri && known?.has(path)) {
          icons.set(path, decodeDataUri(dataUri));
          loaded++;
        }
      }
    }
    return loaded;
  }

  async function fetchIcon(path: string): Promise<Icon> {
    const res = await client.icon(path);
    const bytes = await res.arrayBuffer();
    const icon = { type: res.headers.get("Content-Type") ?? "image/png", body: Buffer.from(bytes) };
    if (known?.has(path)) {
      icons.set(path, icon);
    }
    return icon;
  }

  return {
    hasKnownIcons: () => known !== undefined,

    async get(path) {
      if (!known?.has(path)) {
        return undefined;
      }
      const cached = icons.get(path);
      if (cached) {
        return cached;
      }
      await warming.catch(() => undefined);
      const warmed = icons.get(path);
      if (warmed) {
        return warmed;
      }
      let inFlight = fetching.get(path);
      if (!inFlight) {
        inFlight = fetchIcon(path).finally(() => fetching.delete(path));
        fetching.set(path, inFlight);
      }
      return inFlight;
    },

    warm(paths) {
      known = new Set(paths);
      for (const path of icons.keys()) {
        if (!known.has(path)) {
          icons.delete(path);
        }
      }
      const loading = loadBatches(paths);
      warming = loading;
      return loading;
    },
  };
}

function decodeDataUri(dataUri: string): Icon {
  const [header = "", data = ""] = dataUri.split(",", 2);
  return { type: header.slice("data:".length).split(";")[0] || "image/png", body: Buffer.from(data, "base64") };
}
