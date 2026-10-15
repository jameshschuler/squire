import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { MaterialListItem } from "@/components/materials/MaterialListItem";
import type { Material } from "@/lib/materials";
import { renderWithRouter } from "./render-with-router";

afterEach(cleanup);

const material = (skills: Material["skills"]): Material => ({
  item: { id: "bones", name: "Bones", icon: "" },
  sources: [],
  skills,
});

describe("MaterialListItem", () => {
  it("links to the item and shows its gathering skills", async () => {
    await renderWithRouter(
      <ul>
        <MaterialListItem
          material={material([
            { id: "hunting", name: "Hunting", level: 25 },
            { id: "foraging", name: "Foraging", level: 55 },
          ])}
        />
      </ul>,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/items/bones");
    expect(link.textContent).toBe("BonesHunting lvl. 25 · Foraging lvl. 55");
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
