import type { WalkScapeClient } from "@walkscape-community/data-api-client";

const BATCH_SIZE = 200;

export interface Icon {
  type: string;
  body: Buffer;
}

export interface IconStore {
  get(path: string): Promise<Icon | undefined>;
  warm(paths: string[]): Promise<number>;
}

export function createIconStore(client: WalkScapeClient): IconStore {
  const icons = new Map<string, Icon>();
  let known = new Set<string>();

  return {
    async get(path) {
      if (!known.has(path)) {
        return undefined;
      }
      const cached = icons.get(path);
      if (cached) {
        return cached;
      }
      const res = await client.icon(path);
      const bytes = await res.arrayBuffer();
      const icon = { type: res.headers.get("Content-Type") ?? "image/png", body: Buffer.from(bytes) };
      icons.set(path, icon);
      return icon;
    },

    async warm(paths) {
      known = new Set(paths);
      const missing = paths.filter((path) => !icons.has(path));
      let loaded = 0;
      for (let i = 0; i < missing.length; i += BATCH_SIZE) {
        const batch = await client.icons(missing.slice(i, i + BATCH_SIZE));
        for (const [path, dataUri] of Object.entries(batch)) {
          if (dataUri) {
            icons.set(path, decodeDataUri(dataUri));
            loaded++;
          }
        }
      }
      return loaded;
    },
  };
}

function decodeDataUri(dataUri: string): Icon {
  const [header = "", data = ""] = dataUri.split(",", 2);
  return { type: header.slice("data:".length).split(";")[0] || "image/png", body: Buffer.from(data, "base64") };
}
