import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { buildGearData, type GearItem } from "@squire/api/gear-data";
import { RECIPE_BOOK_SCHEMA, buildRecipeBook, type GameData } from "@squire/api/recipe-book";
import exportFixture from "../../../fixtures/character/export.json";
import sample from "../../../fixtures/api/gamedata-sample.json";
import { GearPage } from "@/components/gear/GearPage";
import { CharacterProvider } from "@/contexts/character-context";
import { GameDataProvider } from "@/contexts/game-data-context";
import { GearDataProvider } from "@/contexts/gear-data-context";
import { CHARACTER_STORAGE_KEY, storeCharacter } from "@/lib/character";
import { gearSetCode } from "@/lib/gear-set-code";
import type { GearSearch } from "@/lib/gear-search";
import { renderWithRouter } from "./render-with-router";

vi.mock("@/lib/gear-set-code", () => ({ gearSetCode: vi.fn(async () => "GEAR-SET-CODE") }));

const data = sample as unknown as GameData;
const book = { ...buildRecipeBook(data), schema: RECIPE_BOOK_SCHEMA };
const miningGear = (id: string, slot: GearItem["slot"], steps: number): GearItem => ({
  id,
  name: id.replace(/_/g, " "),
  icon: "",
  quality: null,
  isCollectible: false,
  keywords: [],
  gameId: `game-${id}`,
  slot,
  requirements: [],
  stats: [
    {
      stat: "stepsRequired",
      value: steps,
      isPercent: false,
      conditions: [{ type: "mainSkill", opposite: false, requirement: { skill: "mining" } }],
    },
  ],
  tierStats: {},
});
const baseGear = buildGearData(data);
const withGear = (items: GearItem[]) => ({ ...baseGear, items, bannedKeywords: { pickaxe: ["pickaxe"] } });
const pickaxe = { ...miningGear("iron_pickaxe", "tool", -2), keywords: ["pickaxe"] };
let gear = withGear([miningGear("journeyman_handwear", "hands", -3), pickaxe]);

function Harness({ initial }: { initial: GearSearch }) {
  const [search, setSearch] = useState(initial);
  return <GearPage search={search} onSearchChange={setSearch} />;
}

const serveData = async (url: string) => new Response(JSON.stringify(url.includes("/api/gear") ? gear : book));

async function renderPage(initial: GearSearch = {}, fetchData = serveData) {
  vi.stubGlobal("fetch", vi.fn(fetchData));
  await renderWithRouter(
    <GameDataProvider>
      <CharacterProvider>
        <GearDataProvider>
          <Harness initial={initial} />
        </GearDataProvider>
      </CharacterProvider>
    </GameDataProvider>,
  );
}

async function clickCopy() {
  const button = await screen.findByRole("button", { name: /Copy gear set for WalkScape/ });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(button);
}

const addCharacter = () =>
  localStorage.setItem(CHARACTER_STORAGE_KEY, storeCharacter(JSON.stringify(exportFixture), new Date()));

beforeEach(() => {
  localStorage.clear();
  gear = withGear([miningGear("journeyman_handwear", "hands", -3), pickaxe]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Gear page", () => {
  it("asks what to do and suggests activities and recipes as you type", async () => {
    await renderPage();
    fireEvent.change(await screen.findByPlaceholderText("Search activities and recipes…"), {
      target: { value: "gold" },
    });
    expect(screen.getByRole("button", { name: /Mine gold ore/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Smelt a gold bar/ })).toBeDefined();
  });

  it("uses the best gear in the game without a character, and says so", async () => {
    await renderPage();
    fireEvent.change(await screen.findByPlaceholderText("Search activities and recipes…"), {
      target: { value: "mine" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Mine gold ore/ }));
    expect(screen.queryByText("Where?")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Fastest/ }));
    fireEvent.click(screen.getByRole("button", { name: "Find gear" }));
    expect(screen.getByRole("link", { name: "Add your character" }).getAttribute("href")).toBe("/character");
    expect(await screen.findByText("journeyman handwear")).toBeDefined();
    expect((await screen.findByRole("region", { name: "Set stats" })).textContent).toMatch(/[\d,]+Steps/);
    expect(screen.getByRole("button", { name: /Copy gear set for WalkScape/ })).toBeDefined();
  });

  it("asks where when the activity has several locations, with a best-location choice", async () => {
    await renderPage({ target: "recipe:bake_a_bagel" });
    expect(await screen.findByText("Where?")).toBeDefined();
    expect(screen.getByRole("button", { name: "Best location" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Blackspell Harbour" }));
    expect(screen.getByRole("button", { name: "Change answer: Blackspell Harbour" })).toBeDefined();
  });

  it("names the location it picked for the best location", async () => {
    await renderPage({ target: "recipe:bake_a_bagel", location: "best", goals: "steps" });
    expect(await screen.findByRole("button", { name: /^Change answer: Best location: \S/ })).toBeDefined();
  });

  it("says when no gear helps", async () => {
    await renderPage({ target: "recipe:bake_a_bagel", location: "best", goals: "steps" });
    expect(await screen.findByText("No gear helps with this.")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Copy gear set for WalkScape/ })).toBeNull();
    expect(screen.getByRole("region", { name: "Set stats" }).textContent).toMatch(/\d+ \(priority\)Steps/);
  });

  it("uses the character's gear without asking, and compares with what they wear now", async () => {
    addCharacter();
    await renderPage({ target: "activity:mine_gold_ore", goals: "steps" });
    expect(await screen.findByText(/vs now/)).toBeDefined();
    expect(screen.queryByText("Whose gear?")).toBeNull();
    expect(screen.getByRole("link", { name: /journeyman handwear.*Equipped/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /iron pickaxe/ }).textContent).not.toContain("Equipped");
  });

  it("asks for priorities in order, up to three, offering only goals the activity can give", async () => {
    await renderPage({ target: "activity:mine_gold_ore" });
    expect(await screen.findByText("What matters most? Pick up to 3, in order.")).toBeDefined();
    expect(screen.getByRole("button", { name: /^Most chests/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: /^Most bird nests/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Save materials/ })).toBeNull();
    expect((screen.getByRole("button", { name: "Find gear" }) as HTMLButtonElement).disabled).toBe(true);
    for (const goal of ["Most chests", "Fastest", "Most XP", "Most items"]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${goal}`) }));
    }
    expect(screen.getByRole("button", { name: /^1\s*Most chests/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /^Most items/ }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Find gear" }));
    expect(screen.getByRole("button", { name: "Change answer: Most chests › Fastest › Most XP" })).toBeDefined();
  });

  it("explains each goal, including that Fastest counts double action", async () => {
    await renderPage({ target: "activity:mine_gold_ore" });
    expect((await screen.findByRole("button", { name: /^Fastest/ })).textContent).toContain("double action");
  });

  it("offers a recommended set of priorities in one tap", async () => {
    await renderPage({ target: "activity:mine_gold_ore" });
    fireEvent.click(await screen.findByRole("button", { name: /Use recommended/ }));
    expect(screen.getByRole("button", { name: "Change answer: Fastest › Most items › Most chests" })).toBeDefined();
  });

  it("offers crafting goals for recipes", async () => {
    await renderPage({ target: "recipe:smelt_a_gold_bar" });
    expect(await screen.findByRole("button", { name: /^Save materials/ })).toBeDefined();
    expect(screen.queryByRole("button", { name: /^Best quality/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Most chests/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Use recommended/ }).textContent).toContain(
      "Fastest › Save materials › Most XP",
    );
  });

  it("shows steps per action even when fewest steps isn't a priority", async () => {
    await renderPage({ target: "activity:mine_gold_ore", goals: "chests" });
    const stats = await screen.findByRole("region", { name: "Set stats" });
    expect(stats.textContent).toMatch(/\d+Steps/);
  });

  it("puts steps first in the stats and highlights the priority stats", async () => {
    await renderPage({ target: "activity:mine_gold_ore", goals: "steps,chests" });
    const stats = await screen.findByRole("region", { name: "Set stats" });
    expect(stats.textContent).toMatch(/^Steps[\d,]+ \(priority\)Steps/);
    expect(stats.textContent).toMatch(/\+[\d.]+% \(priority\)Chest finding/);
    expect(screen.queryByRole("region", { name: "Summary" })).toBeNull();
  });

  it("shows the set's stats, with work efficiency against the activity's max", async () => {
    await renderPage({ target: "activity:mine_gold_ore", goals: "steps" });
    const stats = await screen.findByRole("region", { name: "Set stats" });
    expect(stats.textContent).toContain("Work efficiency");
    expect(stats.textContent).toContain("Work efficiency of 70% max");
    expect(stats.textContent).toContain("−5Steps per action");
  });

  it("shows the game's gear layout, with empty slots left to the player", async () => {
    await renderPage({ target: "activity:mine_gold_ore", goals: "steps" });
    expect(await screen.findByRole("link", { name: /Hands.*journeyman handwear/ })).toBeDefined();
    expect(screen.getAllByText("Player's choice").length).toBeGreaterThan(0);
    expect(screen.getByText("Tool 6")).toBeDefined();
  });

  it("marks only as many copies of a ring as the character wears", async () => {
    const twoRings = { ...exportFixture, bank: { ...exportFixture.bank, gold_ethernite_ring_epic: 1 } };
    localStorage.setItem(CHARACTER_STORAGE_KEY, storeCharacter(JSON.stringify(twoRings), new Date()));
    gear = withGear([miningGear("gold_ethernite_ring", "ring", -3)]);
    await renderPage({ target: "activity:mine_gold_ore", goals: "steps" });
    const ring1 = await screen.findByRole("link", { name: /Ring 1.*gold ethernite ring/ });
    const ring2 = screen.getByRole("link", { name: /Ring 2.*gold ethernite ring/ });
    expect([ring1, ring2].filter((cell) => cell.querySelector('[aria-label="Equipped"]')).length).toBe(1);
  });

  it("says when the character already wears the best set", async () => {
    addCharacter();
    gear = withGear([miningGear("journeyman_handwear", "hands", -3)]);
    await renderPage({ target: "activity:mine_gold_ore", goals: "steps" });
    expect(await screen.findByText("You're already wearing the best set for this.")).toBeDefined();
    expect(screen.getByRole("region", { name: "Set stats" }).textContent).toContain("same as now");
  });

  it("says when the character's level is too low, and still shows the set", async () => {
    addCharacter();
    await renderPage({ target: "recipe:smelt_a_gold_bar", goals: "steps" });
    expect(
      await screen.findByText("You need Smithing level 15 for this. Here's the set for when you get there."),
    ).toBeDefined();
  });

  it("starts over from the first question", async () => {
    await renderPage({ target: "recipe:bake_a_bagel", location: "best", goals: "steps" });
    fireEvent.click(await screen.findByRole("button", { name: "Start over" }));
    expect(screen.getByPlaceholderText("Search activities and recipes…")).toBeDefined();
    expect(screen.queryByText("Where?")).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
  });

  it("goes back to the question when you tap an answer", async () => {
    await renderPage({ target: "activity:mine_gold_ore", goals: "steps" });
    fireEvent.click(await screen.findByRole("button", { name: "Change answer: Mine gold ore" }));
    expect(screen.getByPlaceholderText("Search activities and recipes…")).toBeDefined();
    expect(screen.queryByText(/steps per action/)).toBeNull();
  });

  it("copies the gear set for WalkScape", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    await renderPage({ target: "activity:mine_gold_ore", goals: "steps" });
    await clickCopy();
    expect((await screen.findByRole("status")).textContent).toBe("Copied");
    expect(screen.getByRole("button", { name: /Copied gear set for WalkScape/ })).toBeDefined();
    expect(writeText).toHaveBeenCalledWith("GEAR-SET-CODE");
  });

  it("says when the browser has no clipboard", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
    await renderPage({ target: "activity:mine_gold_ore", goals: "steps" });
    await clickCopy();
    expect(await screen.findByText(/Couldn't copy/)).toBeDefined();
  });

  it("says when copying fails", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn(async () => Promise.reject(new Error("denied"))) },
    });
    await renderPage({ target: "activity:mine_gold_ore", goals: "steps" });
    await clickCopy();
    expect(await screen.findByText(/Couldn't copy/)).toBeDefined();
  });

  it("shows a single loading line until both the game data and gear data arrive", async () => {
    await renderPage({}, async (url) => (url.includes("/api/gear") ? new Promise<Response>(() => {}) : serveData(url)));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByText("Loading game data…")).toBeDefined();
    expect(screen.getAllByRole("paragraph").filter((p) => p.textContent?.includes("Loading"))).toHaveLength(1);
    expect(screen.queryByPlaceholderText("Search activities and recipes…")).toBeNull();
  });

  it.each([
    ["game data", "/api/recipes", "Failed to load game data (503)"],
    ["gear data", "/api/gear", "Failed to load gear data (503)"],
  ])("shows the %s error while the other is still loading", async (_, failing, message) => {
    await renderPage({}, async (url) =>
      url.includes(failing) ? new Response("", { status: 503 }) : new Promise<Response>(() => {}),
    );
    expect(await screen.findByText(message)).toBeDefined();
    expect(screen.queryByText("Loading game data…")).toBeNull();
  });

  it("shows the gear data error", async () => {
    await renderPage({}, async (url) =>
      url.includes("/api/gear") ? new Response("", { status: 503 }) : serveData(url),
    );
    expect(await screen.findByText("Failed to load gear data (503)")).toBeDefined();
  });

  it("asks where again when the location in the link isn't one of the activity's", async () => {
    await renderPage({ target: "recipe:bake_a_bagel", location: "somewhere_else" });
    expect(await screen.findByRole("button", { name: "Best location" })).toBeDefined();
    expect(screen.queryByText(/steps per action/)).toBeNull();
  });

  it("says so when this browser can't build the code", async () => {
    vi.mocked(gearSetCode).mockRejectedValueOnce(new Error("CompressionStream is not defined"));
    await renderPage({ target: "activity:mine_gold_ore", goals: "steps" });
    expect(await screen.findByText("This browser can't build a gear-set code.")).toBeDefined();
    expect((screen.getByRole("button", { name: /Copy gear set for WalkScape/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
