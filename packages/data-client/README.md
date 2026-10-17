# @jameshschuler/walkscape-data-client

An unofficial TypeScript client for the [WalkScape](https://walkscape.app) Data API. It covers every endpoint, and its types are generated from the API's OpenAPI spec, so each resource, response and search filter is typed. It can also load whole resources in a few requests.

It runs anywhere with a global `fetch`: Node 22+, Deno, Bun, Cloudflare Workers and browsers. It has no runtime dependencies.

> Game data and icons are © WalkScape. This package isn't made or endorsed by the WalkScape team.

## Install

```sh
npm install @jameshschuler/walkscape-data-client
```

You need a Data API key. Keys are handed out in the "Walkscape Data API" thread on the [WalkScape Discord](https://discord.gg/Kk6VecJFEk). Keep the key on a server: don't ship it in browser code.

## Quick start

```ts
import { ENVIRONMENTS, createClient } from "@jameshschuler/walkscape-data-client";

const client = createClient({ apiKey: process.env.WALKSCAPE_API_KEY!, baseUrl: ENVIRONMENTS.dev });

const goldBar = await client.recipes.get("smelt_a_gold_bar"); // RecipeDetail
console.log(goldBar.materials); // [{ options: [{ item: "gold_nugget", amount: 7 }, { item: "gold_ore", amount: 2 }] }]

const materials = await client.items.search({ type: "material" }); // ItemListItem[]

const recipes = await client.recipes.loadAll(); // RecipeDetail[], every recipe
const usesGoldBars = recipes.filter((r) => r.materials.some((slot) => slot.options.some((o) => o.item === "gold_bar")));
```

## The client

`createClient(options)` returns a client with one property per resource, all 24 of them, named in camelCase: `client.items`, `client.recipes`, `client.lootTables`, `client.routePaths` and so on. Each has:

| Method                          | Returns                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `list()`                        | Every entry, in compact form (usually `id`, `name`, `icon`).                                              |
| `get(id)`                       | One entry in full. Throws `WalkScapeApiError` (status 404) if it doesn't exist.                           |
| `loadAll()`                     | Every entry, in full. See [Loading whole resources](#loading-whole-resources).                            |
| `search(filters, { detailed })` | Entries matching every filter, e.g. `{ relatedSkills: "cooking" }`. Full entries when `detailed` is true. |

The client itself also has:

| Method                        | Returns                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `version()`                   | The current game data version. It changes whenever the data does.               |
| `health()`                    | Server status, uptime and data version.                                         |
| `maps()` / `map(name)`        | The map images available, and one map image as a `Response`.                    |
| `icon(path)` / `icons(paths)` | One icon image as a `Response`, or up to 200 icons in one request as data URIs. |

Search filters are typed per resource with the values the API accepts, so `client.items.search({ type: "materal" })` is a type error. True/false filters take booleans. A few resources have no filters (`pets`, `jobBoards`, `routePaths` and others), so they have no `search`.

Options: `apiKey` (required), `baseUrl` (defaults to `ENVIRONMENTS.prod`), `locale` (translated strings, falls back to English), `fetch` and `maxRetries` (defaults to 3).

Errors from the API throw `WalkScapeApiError`, which has `status` and `path`.

## Types

Every schema in the API spec is exported under its spec name: `ItemDetail`, `ItemListItem`, `RecipeDetail`, `ActivityDetail`, `LootTableDetail`, `SkillLevelRequirement` and so on. Descriptions from the spec show up in your editor. Items are a union you can narrow on `type`:

```ts
const item = await client.items.get("mining_chest");
if (item.type === "container") {
  console.log(item.tables); // the loot tables the chest rolls when opened
}
```

`ListItem<"lootTables">` and `Detail<"lootTables">` give you a resource's compact and full shapes by name, and `SearchFilters<"items">` its filters. Resource names are camelCase, as on the client.

## Loading whole resources

`loadAll()` returns every entry of a resource in full, e.g. `client.items.loadAll()`. A few resources (`skills`, `achievements`, `rewards`, `routes`, `routePaths`) already list full entries, so they take one request. The rest are fetched in bulk with a few detailed searches, then anything those missed is fetched one at a time. Most resources take a handful of requests. Resources without a usable filter take up to one request per entry: `pfpOptionGroups` (about 200) and `keywords` (about 100) are the slow ones, at a minute or two each under the rate limit.

To load several resources, run them side by side. Track `version()` alongside so you know when to reload:

```ts
const [{ version }, recipes, items, activities] = await Promise.all([
  client.version(),
  client.recipes.loadAll(),
  client.items.loadAll(),
  client.activities.loadAll(),
]);
```

## Rate limits and caching

The API allows **120 requests a minute per IP**.

- JSON responses are cached by ETag, so asking again for unchanged data comes back as a cheap 304.
- Rate-limited (429) and server (5xx) responses are retried, waiting as long as the API's rate-limit headers say.
- Game data rarely changes. Load it once, keep it, and reload only when `version()` changes.
- Develop against `ENVIRONMENTS.dev`. Its data can change without warning.

## Terms

The Data API is free for community tools. Its terms ask you to:

- credit WalkScape somewhere visible;
- not redistribute the raw dataset as your own product;
- talk to the WalkScape team before any commercial use.

## License

[MIT](LICENSE). The license covers this package's code, not WalkScape's game data or icons.
