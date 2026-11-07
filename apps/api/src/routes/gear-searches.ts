import type { FastifyInstance } from "fastify";
import { GOALS } from "@walkscape-community/gear-optimizer";
import { HTTP_STATUS } from "../http-status.js";

const MAX_BODY_BYTES = 2048;
const goalIds = GOALS.map((goal) => goal.id);
const ID_PATTERN = "^[A-Za-z0-9_.-]+$";
const id = { type: "string", maxLength: 100, pattern: ID_PATTERN } as const;

const gearSearchSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "target",
    "kind",
    "location",
    "goals",
    "recommended",
    "withCharacter",
    "bookVersion",
    "failed",
    "searchMs",
    "proven",
    "margin",
  ],
  properties: {
    target: id,
    kind: { enum: ["activity", "recipe"] },
    location: { type: ["string", "null"], maxLength: 100, pattern: ID_PATTERN },
    goals: { type: "array", maxItems: 10, items: { enum: goalIds } },
    recommended: { type: "boolean" },
    withCharacter: { type: "boolean" },
    bookVersion: id,
    failed: { type: "boolean" },
    searchMs: { type: ["number", "null"], minimum: 0, maximum: 600_000 },
    proven: { type: ["boolean", "null"] },
    margin: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["goal", "gap"],
      properties: { goal: { enum: goalIds }, gap: { type: "number" } },
    },
  },
} as const;

export async function gearSearchRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/gear-searches",
    { bodyLimit: MAX_BODY_BYTES, schema: { body: gearSearchSchema } },
    async (request, reply) => {
      request.log.info({ gearSearch: request.body }, "Gear search");

      return reply.code(HTTP_STATUS.NO_CONTENT).send();
    },
  );
}
