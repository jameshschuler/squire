import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { MaterialListItem } from "@/components/materials/MaterialListItem";
import type { Material } from "@/lib/materials";
import { renderWithRouter } from "./render-with-router";

afterEach(cleanup);

const material = (sources: Material["sources"]): Material => ({
  item: { id: "bones", name: "Bones", icon: "" },
  sources,
  skills: [],
});

describe("MaterialListItem", () => {
  it("links to the item and shows just its name", async () => {
    await renderWithRouter(
      <ul>
        <MaterialListItem
          material={material([
            {
              activityId: "wolf_hunting",
              name: "Wolf hunting",
              icon: "",
              skills: [{ id: "hunting", name: "Hunting", level: 25 }],
              lootType: "main",
              locations: [],
            },
          ])}
        />
      </ul>,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/items/bones");
    expect(link.textContent).toBe("Bones");
  });

  it("says when there's no known source", async () => {
    await renderWithRouter(
      <ul>
        <MaterialListItem material={material([])} />
      </ul>,
    );
    expect(screen.getByText("No known source yet")).toBeDefined();
  });
});
