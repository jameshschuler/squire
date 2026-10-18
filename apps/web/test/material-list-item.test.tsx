import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { MaterialListItem } from "@/components/materials/MaterialListItem";
import { renderWithRouter } from "./render-with-router";

afterEach(cleanup);

describe("MaterialListItem", () => {
  it("links to the item and shows just its name", async () => {
    await renderWithRouter(
      <ul>
        <MaterialListItem
          material={{
            item: {
              id: "bones",
              name: "Bones",
              icon: "",
              quality: null,
              isCollectible: false,
              keywords: [],
            },
            sources: [],
            skills: [],
            isCrafted: false,
          }}
        />
      </ul>,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/items/bones");
    expect(link.textContent).toBe("Bones");
  });
});
