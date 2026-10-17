import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SourceLocations } from "@/components/items/SourceLocations";

afterEach(cleanup);

describe("SourceLocations", () => {
  it("lists locations by region, then by name, with the region in brackets", () => {
    render(
      <SourceLocations
        locations={[
          { id: "wraithwater", name: "Wraithwater", region: "Empire of Wallisia" },
          { id: "centaham", name: "Centaham", region: "Jarvonia" },
          { id: "salsfirth", name: "Salsfirth", region: "Grand Duchy of Trellin-Erdwise" },
          { id: "azurazera", name: "Azurazera", region: "Jarvonia" },
        ]}
      />,
    );
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Salsfirth (GDTE)",
      "Azurazera (Jarvonia)",
      "Centaham (Jarvonia)",
      "Wraithwater (Wallisia)",
    ]);
  });
});
