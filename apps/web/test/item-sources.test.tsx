import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ActivitySource, ChestSource, ShopSource } from "@jameshschuler/walkscape-sdk";
import { ItemSources } from "@/components/items/ItemSources";

afterEach(cleanup);

const source = (overrides: Partial<ActivitySource>): ActivitySource => ({
  kind: "activity",
  id: "bear_hunting",
  name: "Bear hunting",
  icon: "",
  skills: [{ id: "hunting", name: "Hunting", level: 45 }],
  lootType: "main",
  locations: [{ id: "nomad_woods", name: "Nomad Woods", region: "Jarvonia" }],
  ...overrides,
});

describe("ItemSources", () => {
  it("shows each activity with its skill level and locations", () => {
    render(<ItemSources sources={[source({})]} />);
    expect(screen.getByText("Bear hunting")).toBeDefined();
    expect(screen.getByText("Hunting lvl. 45")).toBeDefined();
    expect(screen.getByText("Nomad Woods").textContent).toBe("Nomad Woods (Jarvonia)");
  });

  it("shortens long region names", () => {
    render(
      <ItemSources
        sources={[source({ locations: [{ id: "wraithwater", name: "Wraithwater", region: "Empire of Wallisia" }] })]}
      />,
    );
    expect(screen.getByText("Wraithwater").textContent).toBe("Wraithwater (Wallisia)");
  });

  it("labels drops that aren't the main loot", () => {
    render(<ItemSources sources={[source({}), source({ id: "mine", name: "Mining", lootType: "gem" })]} />);
    expect(screen.getAllByText("Gem find")).toHaveLength(1);
  });

  it("says when an activity has no known location", () => {
    render(<ItemSources sources={[source({ locations: [] })]} />);
    expect(screen.getByText("No known location")).toBeDefined();
  });

  it("shows a chest by its name", () => {
    const chest: ChestSource = {
      kind: "chest",
      id: "woodcutting_chest",
      name: "Woodcutting chest",
      icon: "",
      skills: [{ id: "woodcutting", name: "Woodcutting", level: 1 }],
    };
    render(<ItemSources sources={[chest]} />);
    expect(screen.getByText("Woodcutting chest")).toBeDefined();
    expect(screen.getByRole("listitem").textContent).toBe("Woodcutting chest");
  });

  it("shows a shop, with its location when known", () => {
    const shop: ShopSource = {
      kind: "shop",
      id: "granfiddich_tool_stall",
      name: "Granfiddich tool stall",
      icon: "",
      locations: [{ id: "granfiddich", name: "Granfiddich", region: "Grand Duchy of Trellin-Erdwise" }],
    };
    render(<ItemSources sources={[shop]} />);
    expect(screen.getByText("Granfiddich tool stall")).toBeDefined();
    expect(screen.getByText("Shop")).toBeDefined();
    expect(screen.getByText("Granfiddich").textContent).toBe("Granfiddich (GDTE)");
  });

  it("says when there's no known source", () => {
    render(<ItemSources sources={[]} />);
    expect(screen.getByText("No known source yet.")).toBeDefined();
  });
});
