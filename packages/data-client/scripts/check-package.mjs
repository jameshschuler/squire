import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tarball = process.argv[2];
if (!tarball) {
  console.error("Usage: node scripts/check-package.mjs <path to packed .tgz>");
  process.exit(1);
}

const consumer = `import { createClient, type ItemDetail } from "@walkscape-community/data-api-client";

const requests: Request[] = [];
const client = createClient({
  apiKey: "test-key",
  baseUrl: "https://data.example",
  fetch: async (input, init) => {
    requests.push(new Request(input, init));
    const body = new URL(requests.at(-1)!.url).pathname === "/version/" ? { version: "v1" } : { id: "bones" };
    return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  },
});

const { version } = await client.version();
const item: ItemDetail = await client.items.get("bones");

// @ts-expect-error the published types know which resources exist
client.notAResource;

if (version !== "v1" || item.id !== "bones") {
  throw new Error(\`Unexpected responses: \${version}, \${item.id}\`);
}
const urls = requests.map((request) => request.url);
if (urls.join() !== "https://data.example/version/,https://data.example/items/id/bones") {
  throw new Error(\`Unexpected requests: \${urls.join(", ")}\`);
}
if (requests.some((request) => request.headers.get("Authorization") !== "Bearer test-key")) {
  throw new Error("A request was sent without the API key");
}
console.log("Installed package imports, type-checks and calls the API.");
`;

const tsconfig = {
  compilerOptions: {
    target: "ES2023",
    lib: ["ES2023", "DOM"],
    module: "NodeNext",
    moduleResolution: "NodeNext",
    strict: true,
    outDir: "out",
    skipLibCheck: false,
  },
  include: ["consumer.ts"],
};

const dir = mkdtempSync(join(tmpdir(), "data-client-consumer-"));
try {
  writeFileSync(join(dir, "package.json"), JSON.stringify({ private: true, type: "module" }));
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify(tsconfig));
  writeFileSync(join(dir, "consumer.ts"), consumer);
  const run = (command, args) => execFileSync(command, args, { cwd: dir, stdio: "inherit" });
  run("npm", ["install", resolve(tarball), "--ignore-scripts", "--no-audit", "--no-fund"]);
  const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
  run(process.execPath, [tsc, "-p", "."]);
  run(process.execPath, ["out/consumer.js"]);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
