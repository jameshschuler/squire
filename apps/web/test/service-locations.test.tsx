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
          { id: "town", name: "Town", tier: "basic" },
          { id: "city", name: "City", tier: "advanced" },
        ])}
      />,
    );
    const row = (name: string) => screen.getByText(name).closest("li")!;
    expect(row("City").textContent).toBe("Cityadvanced");
    expect(row("Town").textContent).toBe("Town");
  });

  it("says when no location has the service", () => {
    render(<ServiceLocations service={service([])} />);
    expect(screen.getByText("No known location")).toBeDefined();
  });
});
