import type { FastifyInstance } from "fastify";
import type { WalkScapeClient } from "@squire/walkscape-sdk";

interface Icon {
  type: string;
  body: Buffer;
}

export function iconRoutes(client: WalkScapeClient) {
  const icons = new Map<string, Icon>();

  async function loadIcon(path: string): Promise<Icon> {
    const cached = icons.get(path);
    if (cached) {
      return cached;
    }
    const res = await client.icon(path);
    const icon = { type: res.headers.get("Content-Type") ?? "image/png", body: Buffer.from(await res.arrayBuffer()) };
    icons.set(path, icon);
    return icon;
  }

  return async (app: FastifyInstance): Promise<void> => {
    app.get<{ Params: { "*": string } }>("/api/icons/*", async (request, reply) => {
      const icon = await loadIcon(request.params["*"]);
      return reply.type(icon.type).header("Cache-Control", "public, max-age=604800").send(icon.body);
    });
  };
}
