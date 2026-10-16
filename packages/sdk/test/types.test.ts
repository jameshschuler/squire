import { describe, expectTypeOf, it } from "vitest";
import {
  SERVICE_TIERS,
  type Detail,
  type ItemDetail,
  type ItemListItem,
  type ListItem,
  type SearchFilters,
  type SearchableResource,
  type ServiceTier,
  type WalkScapeClient,
} from "../src/index.js";

describe("types", () => {
  it("lists every service tier the API knows", () => {
    expectTypeOf<(typeof SERVICE_TIERS)[number]>().toEqualTypeOf<ServiceTier>();
  });

  it("maps resources to their list and detail shapes", () => {
    expectTypeOf<ListItem<"items">>().toEqualTypeOf<ItemListItem>();
    expectTypeOf<Detail<"items">>().toEqualTypeOf<ItemDetail>();
  });

  it("returns each resource's own shapes from the client", () => {
    const check = (client: WalkScapeClient) => {
      expectTypeOf(client.list("items")).resolves.toEqualTypeOf<ItemListItem[]>();
      expectTypeOf(client.get("items", "gold_ore")).resolves.toEqualTypeOf<ItemDetail>();
      expectTypeOf(client.search("items", { type: "material" })).resolves.toEqualTypeOf<ItemListItem[]>();
      expectTypeOf(client.search("items", { canBeSold: true }, { detailed: true })).resolves.toEqualTypeOf<
        ItemDetail[]
      >();
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
