import type { WalkScapeClient } from "@squire/walkscape-sdk";

const BATCH_SIZE = 200;

export interface Icon {
  type: string;
  body: Buffer;
}

export interface IconStore {
  get(path: string): Promise<Icon>;
  warm(paths: string[]): Promise<number>;
}

export function createIconStore(client: WalkScapeClient): IconStore {
  const icons = new Map<string, Icon>();

  return {
    async get(path) {
      const cached = icons.get(path);
      if (cached) {
        return cached;
      }
      const res = await client.icon(path);
      const icon = { type: res.headers.get("Content-Type") ?? "image/png", body: Buffer.from(await res.arrayBuffer()) };
      icons.set(path, icon);
      return icon;
    },

    async warm(paths) {
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
