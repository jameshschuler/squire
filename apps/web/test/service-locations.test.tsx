import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { RecipeService } from "@jameshschuler/walkscape-sdk";
import { ServiceLocations } from "@/components/recipes/ServiceLocations";

afterEach(cleanup);

const service = (locations: RecipeService["locations"]): RecipeService => ({
  label: "Forge (basic)",
  tier: "basic",
  locations,
});

describe("ServiceLocations", () => {
  it("marks locations that only have a higher tier", () => {
    render(
      <ServiceLocations
        service={service([
          { id: "town", name: "Town", region: "Jarvonia", tier: "basic" },
          { id: "city", name: "City", region: "Syrenthia", tier: "advanced" },
        ])}
      />,
    );
    const row = (name: string) => screen.getByText(name, { exact: false }).closest("li")!;
    expect(row("City").textContent).toBe("City (Syrenthia)advanced");
    expect(row("Town").textContent).toBe("Town (Jarvonia)");
  });

  it("shows each location with its region in brackets", () => {
    render(
      <ServiceLocations
        service={service([
          { id: "frusenholm", name: "Frusenholm", region: "Jarvonia", tier: "basic" },
          { id: "salsfirth", name: "Salsfirth", region: "Grand Duchy of Trellin-Erdwise", tier: "basic" },
        ])}
      />,
    );
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Frusenholm (Jarvonia)",
      "Salsfirth (GDTE)",
    ]);
  });

  it("says when no location has the service", () => {
    render(<ServiceLocations service={service([])} />);
    expect(screen.getByText("No known location")).toBeDefined();
  });
});
