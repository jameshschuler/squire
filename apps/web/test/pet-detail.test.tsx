import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import { buildRecipeBook, type GameData, type PetPage } from "@squire/api/recipe-book";
import { PetDetail } from "@/components/pets/PetDetail";
import sample from "../../../fixtures/api/gamedata-sample.json";
import { renderWithRouter } from "./render-with-router";

const [mummy] = buildRecipeBook(sample as unknown as GameData).pets;

afterEach(cleanup);

const section = (title: string) => within(screen.getByRole("heading", { name: title }).parentElement!);

describe("PetDetail", () => {
  it("shows the pet's name and description", async () => {
    await renderWithRouter(<PetDetail pet={mummy!} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Mummy");
    expect(screen.getByText(/An unruffled mummy/)).toBeDefined();
  });

  it("lists each level with its stage and effects", async () => {
    await renderWithRouter(<PetDetail pet={mummy!} />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Level 1 · Juvenile",
      "Level 4 · Adult",
    ]);
    const first = section("Level 1 · Juvenile");

    expect(first.getByText("While doing tailoring")).toBeDefined();
    expect(first.getByText("Work efficiency").nextElementSibling?.textContent).toBe("+2%");
  });

  it("links to the egg it hatches from", async () => {
    const egg = { id: "mummy_egg", name: "Mummy egg", icon: "", quality: null, isCollectible: false, keywords: [] };

    await renderWithRouter(<PetDetail pet={{ ...mummy!, egg }} />);
    expect(section("Hatches from").getByRole("link", { name: "Mummy egg" }).getAttribute("href")).toBe(
      "/items/mummy_egg",
    );
  });

  it("has no egg section when the egg has no page", async () => {
    await renderWithRouter(<PetDetail pet={mummy!} />);
    expect(screen.queryByRole("heading", { name: "Hatches from" })).toBeNull();
  });

  it("says when a level has no effects", async () => {
    const pet: PetPage = { ...mummy!, levels: [{ level: 1, stage: "juvenile", effects: [] }] };

    await renderWithRouter(<PetDetail pet={pet} />);
    expect(screen.getByText("No effects at this level.")).toBeDefined();
  });
});
