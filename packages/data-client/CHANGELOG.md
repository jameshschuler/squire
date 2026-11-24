# Changelog

## 0.0.4

Types regenerated from the API's latest spec.

- Service ids lost their `_basic` and `_advanced` suffixes, so the `serviceList` filter on location search takes the new ids (`alight_kitchen`, `cursed_forge`, …). The tier is still on each service's `tier`.
- Title search's `color` filter takes 15 new colors, such as `walker_yellow`, `supporter_yellow` and `orange`.
- A title's requirements can now be collectibles owned or an item anywhere.

## 0.0.3

Types regenerated from the API's latest spec.

- `client.titles` for the new titles resource, with `list()`, `get(id)`, `loadAll()` and `search(filters)` (by `color`, `type`, `hidden` and `isDefault`).
- Eight new requirement types: closed beta tester, supporter tiers and history, Ironfoot, items gained and total steps.
- The `ItemQuality` type now includes `null`, since an item's quality and each quality tier's quality can be `null`. Code that uses `ItemQuality` as a real quality (for example `Record<ItemQuality, string>`) needs `NonNullable<ItemQuality>`.
- A requirement's `name` is now optional.
- Job board details no longer type their `jobs`. The spec moved this week's jobs to new `/jobs/` endpoints, which the client doesn't wrap yet; their types (`JobsWeek`, `Job`) are exported.

## 0.0.2

- `client.items.ids(ids, to)` converts item ids to the game's internal ids (used in gear-set codes) and back, through `POST /items/ids`. The endpoint isn't in the API's OpenAPI spec yet, so its types are written by hand.

## 0.0.1

First release.

- A client for every resource in the WalkScape Data API, one namespace each: `client.items`, `client.recipes`, `client.lootTables` and the other 21. Each has `list()`, `get(id)` and `loadAll()`, plus `search(filters)` where the API has filters.
- Types for every response and search filter, generated from the API's OpenAPI spec.
- `loadAll()` loads a whole resource in a few requests, using bulk searches and then fetching anything they missed.
- `version()`, `health()`, `maps()`, `map(name)`, `icon(path)` and `icons(paths)`.
- JSON responses are cached by ETag, and rate-limited (429) and server (5xx) responses are retried.
