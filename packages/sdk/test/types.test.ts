import { describe, expectTypeOf, it } from "vitest";
import type { ApiResource, ApiResourceOf } from "../src/api-resources.js";
import { RESOURCES, SEARCHABLE_RESOURCES } from "../src/generated/resources.js";
import {
  SERVICE_TIERS,
  type Detail,
  type ItemDetail,
  type ItemListItem,
  type ListItem,
  type LootTableDetail,
  type LootTableListItem,
  type ResourceName,
  type SearchFilters,
  type SearchableResource,
  type ServiceTier,
  type WalkScapeClient,
} from "../src/index.js";

describe("types", () => {
  it("generates the same resource lists the spec's types describe", () => {
    expectTypeOf<(typeof RESOURCES)[number]>().toEqualTypeOf<ApiResource>();
    expectTypeOf<(typeof SEARCHABLE_RESOURCES)[number]>().toEqualTypeOf<ApiResourceOf<SearchableResource>>();
  });

  it("only gives search to resources with filters", () => {
    expectTypeOf<WalkScapeClient["pets"]>().not.toHaveProperty("search");
    expectTypeOf<WalkScapeClient["items"]>().toHaveProperty("search");
    expectTypeOf<WalkScapeClient["lootTables"]["get"]>().returns.resolves.toEqualTypeOf<LootTableDetail>();
  });

  it("lists every service tier the API knows", () => {
    expectTypeOf<(typeof SERVICE_TIERS)[number]>().toEqualTypeOf<ServiceTier>();
  });

  it("names resources in camelCase, as the client does", () => {
    expectTypeOf<"lootTables">().toExtend<ResourceName>();
    expectTypeOf<"loot_tables">().not.toExtend<ResourceName>();
    expectTypeOf<ListItem<"lootTables">>().toEqualTypeOf<LootTableListItem>();
    expectTypeOf<keyof WalkScapeClient>().toExtend<
      ResourceName | "version" | "health" | "maps" | "map" | "icon" | "icons"
    >();
    expectTypeOf<ResourceName>().toExtend<keyof WalkScapeClient>();
  });

  it("maps resources to their list and detail shapes", () => {
    expectTypeOf<ListItem<"items">>().toEqualTypeOf<ItemListItem>();
    expectTypeOf<Detail<"items">>().toEqualTypeOf<ItemDetail>();
  });

  it("returns each resource's own shapes from the client", () => {
    const check = (client: WalkScapeClient) => {
      expectTypeOf(client.items.list()).resolves.toEqualTypeOf<ItemListItem[]>();
      expectTypeOf(client.items.get("gold_ore")).resolves.toEqualTypeOf<ItemDetail>();
      expectTypeOf(client.items.loadAll()).resolves.toEqualTypeOf<ItemDetail[]>();
      expectTypeOf(client.items.search({ type: "material" })).resolves.toEqualTypeOf<ItemListItem[]>();
      expectTypeOf(client.items.search({ canBeSold: true }, { detailed: true })).resolves.toEqualTypeOf<ItemDetail[]>();
    };
    expectTypeOf(check).toBeFunction();
  });

  it("types search filters from the spec, with booleans for true/false filters", () => {
    expectTypeOf<SearchFilters<"items">["type"]>().toEqualTypeOf<
      | "material"
      | "container"
      | "crafted"
      | "loot"
      | "consumable"
      | "collectible"
      | "currency"
      | "egg"
      | "lore"
      | undefined
    >();
    expectTypeOf<SearchFilters<"items">["canBeSold"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<"pets">().not.toExtend<SearchableResource>();
  });
});
