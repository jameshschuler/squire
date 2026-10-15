# @jameshschuler/walkscape-sdk

An unofficial, fully typed TypeScript client for the [WalkScape](https://walkscape.app) Data API, with a loader for the whole game dataset and a few helpers for working with it.

It runs anywhere with a global `fetch`: Node 22+, Deno, Bun, Cloudflare Workers and browsers. It has no runtime dependencies.

> Game data and icons are © WalkScape. This package isn't made or endorsed by the WalkScape team.

## Install

```sh
npm install @jameshschuler/walkscape-sdk
```

You need a Data API key. Keys are handed out in the "Walkscape Data API" thread on the [WalkScape Discord](https://discord.gg/Kk6VecJFEk). Keep the key on a server: don't ship it in browser code.

## Quick start

```ts
import { ENVIRONMENTS, createClient, loadGameData, recipesUsing, type Recipe } from "@jameshschuler/walkscape-sdk";

const client = createClient({ apiKey: process.env.WALKSCAPE_API_KEY!, baseUrl: ENVIRONMENTS.dev });

const goldBar = await client.get<Recipe>("recipes", "smelt_a_gold_bar");
console.log(goldBar.materials); // [{ options: [{ item: "gold_nugget", amount: 7 }, { item: "gold_ore", amount: 2 }] }]

const data = await loadGameData(client);
console.log(recipesUsing(data.recipes, "gold_bar").map((r) => r.name)); // ["Assemble dynamite", ...]
```

## The client

`createClient(options)` returns a client for the API's resources (`items`, `recipes`, `locations`, `skills`, `services` and more):

| Method                                   | Returns                                                                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `version()`                              | The current game data version. It changes whenever the data does.                                                    |
| `list(resource)`                         | Every entry, in compact form (usually `id`, `name`, `icon`).                                                         |
| `get(resource, id)`                      | One entry in full. Throws `WalkScapeApiError` (status 404) if it doesn't exist.                                      |
| `search(resource, params, { detailed })` | Entries matching every field in `params`, e.g. `{ relatedSkills: "cooking" }`. Full entries when `detailed` is true. |
| `icon(path)`                             | One icon image as a `Response`.                                                                                      |
| `icons(paths)`                           | Up to 200 icons in one request, as data URIs.                                                                        |

Options: `apiKey` (required), `baseUrl` (defaults to `ENVIRONMENTS.prod`), `locale` (translated strings, falls back to English), `fetch` and `maxRetries` (defaults to 3).

Errors from the API throw `WalkScapeApiError`, which has `status` and `path`.

## Loading all game data

`loadGameData(client)` loads every recipe, item (in full), skill, crafting service, location, faction, activity, loot table and shop: about 60 requests, a couple of seconds. Each entry comes back exactly as the API sends it, along with the data `version`.

## Helpers

Small helpers for questions that come up with raw API data. Each takes and returns API shapes.

| Function                                      | What it does                                                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `recipesMaking(recipes, itemId)`              | Recipes that produce an item.                                                                            |
| `recipesUsing(recipes, itemId)`               | Recipes that take an item as a material, in any slot or option.                                          |
| `lootTableItemIds(table)`                     | Every item id a loot table can drop, including its sub-tables.                                           |
| `isSkillLevelRequirement(requirement)`        | Narrows a requirement to a skill level requirement.                                                      |
| `isServiceRequirement(requirement)`           | Narrows a requirement to a crafting service requirement.                                                 |
| `serviceKeywords(requirement)`                | The service keywords a requirement asks for, e.g. `["kitchen", "cursed"]`, whichever shape the API used. |
| `meetsServiceTier(serviceTier, requiredTier)` | Whether a service tier qualifies. Higher tiers do: an advanced kitchen can cook basic kitchen recipes.   |

```ts
const kitchens = data.services.filter((s) => s.keywords.includes("kitchen") && meetsServiceTier(s.tier, "basic"));
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
