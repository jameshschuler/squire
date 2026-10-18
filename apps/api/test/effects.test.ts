import type { ItemDetail, SkillDetail } from "@jameshschuler/walkscape-data-client";
import { describe, expect, it } from "vitest";
import { itemEffects } from "../src/recipe-book/effects.js";
import foods from "../../../fixtures/api/foods.json";
import lootItems from "../../../fixtures/api/loot.json";

const food = (id: string) => (foods as unknown as ItemDetail[]).find((f) => f.id === id)!;

const SKILL_TYPES = {
  agility: "utility",
  carpentry: "artisan",
  cooking: "artisan",
  crafting: "artisan",
  fishing: "gathering",
  foraging: "gathering",
  hunting: "gathering",
  mining: "gathering",
  smithing: "artisan",
  tailoring: "artisan",
  trinketry: "artisan",
  woodcutting: "gathering",
};
const SKILLS = Object.entries(SKILL_TYPES).map(
  ([id, type]) => ({ id, name: id.charAt(0).toUpperCase() + id.slice(1), type }) as SkillDetail,
);
const ALL_SKILLS = Object.keys(SKILL_TYPES);

const withUnknownRequirement = (opposite: boolean) => {
  const pie = structuredClone(food("salmon_pie"));
  const buffs = pie.type === "consumable" ? pie.buffs! : [];
  buffs[0]!.data[0]!.buffs[0]!.attributes[0]!.requirements = [
    { type: "locationHasKeywords", name: null, opposite, requirement: {} },
  ] as never;
  return pie;
};

describe("itemEffects", () => {
  const effect = (condition: string, stat: string, normal: string, fine = normal) => ({
    condition,
    stat,
    normal,
    fine,
  });

  it.each([
    ["salmon_pie", 1000, [effect("While doing Woodcutting", "Work efficiency", "+7%", "+14%")]],
    ["bagel", 1000, [effect("While doing Agility", "Work efficiency", "+5%")]],
    ["beer", 1000, [effect("Global", "Bonus experience", "-4%"), effect("Global", "Double rewards", "+2%", "+4%")]],
    ["bread", 1000, [effect("While travelling", "Work efficiency", "+10%", "+25%")]],
    [
      "crab_rolls",
      750,
      [
        effect("While doing Foraging", "Chance to find 1 to 10 gold pieces", "25%", "50%"),
        effect("While doing Hunting", "Chance to find 1 to 10 gold pieces", "25%", "50%"),
      ],
    ],
    ["dried_fruit", 5000, [effect("While doing gathering skills", "Double action", "+6%", "+9%")]],
    ["bug_bait", 5000, [effect("While doing Fishing", "Steps required", "-1", "-2")]],
    ["beef_stew", 10000, [effect("Global", "Inventory space", "+5", "+10")]],
  ])("describes %s's buff from its stats", (id, steps, effects) => {
    expect(itemEffects(food(id), SKILLS)).toMatchObject({ steps, effects });
  });

  it("ignores the game's effect text, which can contradict the stats", () => {
    const bagel = structuredClone(food("bagel"));
    const buffs = bagel.type === "consumable" ? bagel.buffs! : [];
    buffs[0]!.data[0]!.buffs[0]!.attributes[0]!.text = "Chance to find <hl>1</hl> fishing bait";
    expect(itemEffects(bagel, SKILLS)?.effects).toMatchObject([
      effect("While doing Agility", "Work efficiency", "+5%"),
    ]);
  });

  it("has no effects for items that aren't consumables", () => {
    expect(itemEffects({ ...food("bagel"), type: "material" } as unknown as ItemDetail, SKILLS)).toBeNull();
  });

  it.each([
    ["salmon_pie", ["woodcutting"]],
    ["dried_fruit", ["fishing", "foraging", "hunting", "mining", "woodcutting"]],
    ["bread", ["travelling"]],
    ["beef_stew", [...ALL_SKILLS, "travelling"]],
  ])("says which skills %s's effect applies to", (id, expected) => {
    const [effect] = itemEffects(food(id), SKILLS)!.effects;
    expect(effect!.appliesTo.map((target) => target.id)).toEqual(expected);
  });

  it("names the skills an effect applies to", () => {
    const [effect] = itemEffects(food("salmon_pie"), SKILLS)!.effects;
    expect(effect!.appliesTo).toEqual([{ id: "woodcutting", name: "Woodcutting" }]);
  });

  it("doesn't treat an effect with a requirement it doesn't recognize as global", () => {
    const [effect] = itemEffects(withUnknownRequirement(false), SKILLS)!.effects;
    expect(effect!.condition).toBe("Under certain conditions");
    expect(effect!.appliesTo).toEqual([]);
  });

  const negated = (id: string) => {
    const item = structuredClone(food(id));
    const buffs = item.type === "consumable" ? item.buffs! : [];
    const requirement = buffs[0]!.data[0]!.buffs[0]!.attributes[0]!.requirements![0]!;
    requirement.opposite = true;
    return item;
  };
  const appliesTo = (item: ItemDetail) => itemEffects(item, SKILLS)!.effects[0]!.appliesTo.map((target) => target.id);

  it("applies a negated skill requirement to every other skill and travelling", () => {
    expect(appliesTo(negated("salmon_pie"))).toEqual([
      ...ALL_SKILLS.filter((skill) => skill !== "woodcutting"),
      "travelling",
    ]);
  });

  it("applies a negated skill type requirement to skills of other types and travelling", () => {
    expect(appliesTo(negated("dried_fruit"))).toEqual([
      "agility",
      "carpentry",
      "cooking",
      "crafting",
      "smithing",
      "tailoring",
      "trinketry",
      "travelling",
    ]);
  });

  it("applies a negated travelling requirement to every skill but not travelling", () => {
    expect(appliesTo(negated("bread"))).toEqual(ALL_SKILLS);
  });

  it("still applies a negated requirement it doesn't recognize to nothing", () => {
    expect(appliesTo(withUnknownRequirement(true))).toEqual([]);
  });

  it.each([
    ["salmon_pie", "While not doing Woodcutting"],
    ["dried_fruit", "While not doing gathering skills"],
    ["bread", "While not travelling"],
  ])("labels %s's negated requirement to match where it applies", (id, condition) => {
    expect(itemEffects(negated(id), SKILLS)!.effects[0]!.condition).toBe(condition);
  });
});

describe("itemEffects for loot", () => {
  const loot = (name: string) => (lootItems as unknown as ItemDetail[]).find((item) => item.name === name)!;
  const effectsOf = (name: string) => itemEffects(loot(name), SKILLS)!;

  it("reads gear effects, with no duration and no fine version", () => {
    const wrench = effectsOf("Adjustable wrench");
    expect(wrench.steps).toBeNull();
    expect(wrench.effects[0]).toEqual({
      condition: "While doing Crafting",
      stat: "Work efficiency",
      normal: "+7%",
      fine: null,
      appliesTo: [{ id: "crafting", name: "Crafting" }],
    });
  });

  it("treats gear with no requirement as global", () => {
    expect(effectsOf("Absorbing amulet").effects.map((e) => e.condition)).toEqual(["Global", "Global"]);
  });

  it.each([
    ["Birch skis", 0, "While doing Agility (with other conditions)", ["agility"]],
    ["Bogwood boots", 2, "While doing Carpentry (with other conditions)", ["carpentry"]],
  ])("keeps %s's skill when another requirement is one it doesn't model", (name, index, condition, appliesTo) => {
    const effect = effectsOf(name).effects[index]!;
    expect(effect.condition).toBe(condition);
    expect(effect.appliesTo.map((t) => t.id)).toEqual(appliesTo);
  });

  it("combines several known requirements", () => {
    const skis = structuredClone(loot("Birch skis"));
    const attribute = skis.type === "loot" ? skis.itemAttrs![0]! : undefined;
    attribute!.requirements = [
      { type: "mainSkillType", name: null, opposite: false, requirement: { type: "gathering" } },
      { type: "mainSkill", name: null, opposite: true, requirement: { skill: "fishing" } },
    ] as never;
    const [effect] = itemEffects(skis, SKILLS)!.effects;
    expect(effect!.condition).toBe("While doing gathering skills and not doing Fishing");
    expect(effect!.appliesTo.map((t) => t.id)).toEqual(["foraging", "hunting", "mining", "woodcutting"]);
  });
});
