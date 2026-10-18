import type { ItemDetail, SkillDetail } from "@jameshschuler/walkscape-data-client";
import { describe, expect, it } from "vitest";
import { itemEffects } from "../src/recipe-book/effects.js";
import foods from "../../../fixtures/api/foods.json";
import gearItems from "../../../fixtures/api/gear.json";
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
const NAMES = {
  skills: SKILLS,
  regions: new Map([
    ["syrenthia", "Syrenthia"],
    ["grand_duchy_of_trellin_erdwise", "Grand Duchy of Trellin-Erdwise"],
  ]),
  items: new Map([["map_of_jarvonia", { name: "Map of Jarvonia" } as ItemDetail]]),
};

const withUnknownRequirement = (opposite: boolean) => {
  const pie = structuredClone(food("salmon_pie"));
  const buffs = pie.type === "consumable" ? pie.buffs! : [];
  buffs[0]!.data[0]!.buffs[0]!.attributes[0]!.requirements = [
    { type: "gameData", name: null, opposite, requirement: {} },
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
        effect("While doing Foraging", "Find 1–10 gold pieces", "25%", "50%"),
        effect("While doing Hunting", "Find 1–10 gold pieces", "25%", "50%"),
      ],
    ],
    ["dried_fruit", 5000, [effect("While doing gathering skills", "Double action", "+6%", "+9%")]],
    ["bug_bait", 5000, [effect("While doing Fishing", "Steps required", "-1", "-2")]],
    ["beef_stew", 10000, [effect("Global", "Inventory space", "+5", "+10")]],
  ])("describes %s's buff from its stats", (id, steps, effects) => {
    expect(itemEffects(food(id), NAMES)).toMatchObject({ steps, effects });
  });

  it("ignores the game's effect text, which can contradict the stats", () => {
    const bagel = structuredClone(food("bagel"));
    const buffs = bagel.type === "consumable" ? bagel.buffs! : [];
    buffs[0]!.data[0]!.buffs[0]!.attributes[0]!.text = "Chance to find <hl>1</hl> fishing bait";
    expect(itemEffects(bagel, NAMES)?.effects).toMatchObject([effect("While doing Agility", "Work efficiency", "+5%")]);
  });

  it.each([
    ['Chance to find <hl>1</hl> <object id="map_of_jarvonia" />', "Find Map of Jarvonia"],
    ['Chance to find <hl>1</hl> <object id="rough_gem" />', "Find rough gem"],
    ['Chance to find <hl>1</hl> to <hl>10</hl> <object id="rough_gem" />', "Find 1–10 rough gem"],
    ["Chance to find <hl>1</hl> fishing bait", "Find fishing bait"],
    ["Gain <hl>5</hl> to <hl>10</hl> gold pieces", "Gain 5 to 10 gold pieces"],
  ])("shortens a chance effect and names what it finds: %s", (text, stat) => {
    const bagel = structuredClone(food("bagel"));
    const buffs = bagel.type === "consumable" ? bagel.buffs! : [];
    buffs[0]!.data[0]!.buffs[0]!.attributes[0]!.customText = text;
    expect(itemEffects(bagel, NAMES)!.effects[0]!.stat).toBe(stat);
  });

  it("has no effects for items that aren't consumables", () => {
    expect(itemEffects({ ...food("bagel"), type: "material" } as unknown as ItemDetail, NAMES)).toBeNull();
  });

  it.each([
    ["salmon_pie", ["woodcutting"]],
    ["dried_fruit", ["fishing", "foraging", "hunting", "mining", "woodcutting"]],
    ["bread", ["travelling"]],
    ["beef_stew", [...ALL_SKILLS, "travelling"]],
  ])("says which skills %s's effect applies to", (id, expected) => {
    const [effect] = itemEffects(food(id), NAMES)!.effects;
    expect(effect!.appliesTo.map((target) => target.id)).toEqual(expected);
  });

  it("names the skills an effect applies to", () => {
    const [effect] = itemEffects(food("salmon_pie"), NAMES)!.effects;
    expect(effect!.appliesTo).toEqual([{ id: "woodcutting", name: "Woodcutting" }]);
  });

  it("doesn't treat an effect with a requirement it doesn't recognize as global", () => {
    const [effect] = itemEffects(withUnknownRequirement(false), NAMES)!.effects;
    expect(effect!.condition).toBe("Under certain conditions");
    expect(effect!.scope).toBeNull();
    expect(effect!.appliesTo).toEqual([]);
  });

  const negated = (id: string) => {
    const item = structuredClone(food(id));
    const buffs = item.type === "consumable" ? item.buffs! : [];
    const requirement = buffs[0]!.data[0]!.buffs[0]!.attributes[0]!.requirements![0]!;
    requirement.opposite = true;
    return item;
  };
  const appliesTo = (item: ItemDetail) => itemEffects(item, NAMES)!.effects[0]!.appliesTo.map((target) => target.id);

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
    ["salmon_pie", "While not doing Woodcutting", "Not Woodcutting"],
    ["dried_fruit", "While not doing gathering skills", "Not gathering skills"],
    ["bread", "While not travelling", "Not travelling"],
  ])("labels %s's negated requirement to match where it applies", (id, condition, scope) => {
    expect(itemEffects(negated(id), NAMES)!.effects[0]).toMatchObject({ condition, scope });
  });
});

describe("itemEffects for loot", () => {
  const loot = (name: string) => (lootItems as unknown as ItemDetail[]).find((item) => item.name === name)!;
  const effectsOf = (name: string) => itemEffects(loot(name), NAMES)!;

  it("reads gear effects, with no duration and no fine version", () => {
    const wrench = effectsOf("Adjustable wrench");
    expect(wrench.steps).toBeNull();
    expect(wrench.effects[0]).toEqual({
      condition: "While doing Crafting",
      scope: "Crafting",
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
    ["Birch skis", 0, "While doing Agility and at snowy locations", "Agility", ["agility"]],
    ["Bogwood boots", 2, "While in Grand Duchy of Trellin-Erdwise and doing Carpentry", "Carpentry", ["carpentry"]],
  ])("labels %s's place requirement next to its skill", (name, index, condition, scope, appliesTo) => {
    const effect = effectsOf(name).effects[index]!;
    expect(effect.condition).toBe(condition);
    expect(effect.scope).toBe(scope);
    expect(effect.appliesTo.map((t) => t.id)).toEqual(appliesTo);
  });

  it("combines several known requirements", () => {
    const skis = structuredClone(loot("Birch skis"));
    const attribute = skis.type === "loot" ? skis.itemAttrs![0]! : undefined;
    attribute!.requirements = [
      { type: "mainSkillType", name: null, opposite: false, requirement: { type: "gathering" } },
      { type: "mainSkill", name: null, opposite: true, requirement: { skill: "fishing" } },
    ] as never;
    const [effect] = itemEffects(skis, NAMES)!.effects;
    expect(effect!.condition).toBe("While doing gathering skills and not doing Fishing");
    expect(effect!.scope).toBe("Gathering skills and not Fishing");
    expect(effect!.appliesTo.map((t) => t.id)).toEqual(["foraging", "hunting", "mining", "woodcutting"]);
  });

  const withRequirements = (...requirements: object[]) => {
    const skis = structuredClone(loot("Birch skis"));
    const attribute = skis.type === "loot" ? skis.itemAttrs![0]! : undefined;
    attribute!.requirements = requirements as never;
    return itemEffects(skis, NAMES)!.effects[0]!;
  };
  const requirement = (type: string, payload: object, opposite = false) => ({
    type,
    name: null,
    opposite,
    requirement: payload,
  });

  it.each([
    ["realm", { realm: "syrenthia" }, "While in Syrenthia"],
    ["exploreRealm", { realm: "syrenthia" }, "While having explored Syrenthia"],
    ["locationHasKeywords", { keywords: ["snowy"] }, "While at snowy locations"],
    [
      "distinctKeywordItemsEquipped",
      { quantity: 3, keywords: ["adventuring_tool_set"] },
      "While wearing 3 adventuring tool set items",
    ],
    [
      "distinctKeywordItemsEquipped",
      { quantity: 1, keywords: ["adventuring_tool_set"] },
      "While wearing 1 adventuring tool set item",
    ],
    ["distinctKeywordItemInInventory", { quantity: 1, keywords: ["arrows"] }, "While carrying arrows"],
    ["collectiblesOwned", { amount: 10 }, "While owning 10 collectibles"],
    ["achievementPoint", { isPercentage: false, value: 60 }, "While having 60 achievement points"],
    ["totalSkillLevel", { levels: 100 }, "While at total skill level 100"],
    ["skillLevel", { skill: "crafting", level: 50 }, "While at Crafting level 50"],
    ["itemAnywhere", { item: "map_of_jarvonia" }, "While owning Map of Jarvonia"],
    ["activityType", { keywords: [], skill: null, activity: "sledding" }, "While sledding"],
    [
      "historyData",
      { category: "actionCompleted", data: "underwater_basket_weaving", value: 200, distinct: false },
      "While having done underwater basket weaving 200 times",
    ],
    [
      "historyData",
      { category: "stepsWalkedTraveling", value: 125000, distinct: false },
      "While having travelled 125,000 steps",
    ],
  ])("labels a %s requirement and applies it everywhere", (type, payload, condition) => {
    const effect = withRequirements(requirement(type, payload));
    expect(effect.condition).toBe(condition);
    expect(effect.scope).toBe("Global");
    expect(effect.appliesTo.map((t) => t.id)).toEqual([...ALL_SKILLS, "travelling"]);
  });

  it("applies a negated place requirement everywhere", () => {
    const effect = withRequirements(requirement("locationHasKeywords", { keywords: ["underwater"] }, true));
    expect(effect.condition).toBe("While not at underwater locations");
    expect(effect.appliesTo).toHaveLength(ALL_SKILLS.length + 1);
  });

  it("notes requirements it can't read next to ones it can", () => {
    const effect = withRequirements(
      requirement("mainSkill", { skill: "fishing" }),
      requirement("historyData", { category: "somethingNew", value: 1, distinct: false }),
    );
    expect(effect.condition).toBe("While doing Fishing (with other conditions)");
    expect(effect.scope).toBe("Fishing");
    expect(effect.appliesTo.map((t) => t.id)).toEqual(["fishing"]);
  });
});

describe("itemEffects for crafted gear", () => {
  const hatchet = (gearItems as unknown as ItemDetail[]).find((item) => item.id === "steel_hatchet")!;
  const effects = itemEffects(hatchet, NAMES)!;
  const tier = (quality: string) => effects.tiers.find((t) => t.quality === quality)!;
  const values = (list: { stat: string; normal: string }[]) =>
    Object.fromEntries(list.map((effect) => [effect.stat, effect.normal]));

  it("reads the base effects", () => {
    expect(values(effects.effects)).toEqual({ "Work efficiency": "+9%" });
  });

  it("lists the tiers in order, whatever order the API sends them in", () => {
    expect(effects.tiers.map((t) => t.quality)).toEqual(["uncommon", "rare", "epic", "legendary", "ethereal"]);
  });

  it.each([
    ["uncommon", "+11%", "+13%", "+1%", "+15%", "+2%", "+15%"],
    ["rare", "+14%", "+21%", "+2%", "+24%", "+4%", "+24%"],
    ["epic", "+18%", "+24%", "+3%", "+27%", "+6%", "+27%"],
    ["legendary", "+22%", "+25%", "+5%", "+29%", "+8%", "+29%"],
    ["ethereal", "+27%", "+26%", "+12%", "+31%", "+10%", "+31%"],
  ])("adds each tier to the ones below it: %s", (quality, work, chest, action, fine, rewards, nests) => {
    expect(tier(quality).effects).toHaveLength(6);
    expect(values(tier(quality).effects)).toEqual({
      "Work efficiency": work,
      "Chest finding": chest,
      "Double action": action,
      "Fine material finding": fine,
      "Double rewards": rewards,
      "Find bird nests": nests,
    });
  });

  it("keeps each tier's condition", () => {
    expect(new Set(tier("ethereal").effects.map((e) => e.condition))).toEqual(new Set(["While doing Woodcutting"]));
  });

  it("keeps flat and percentage bonuses with the same label apart across tiers", () => {
    const gear = structuredClone(hatchet);
    const bonus = (value: number, isPercent: boolean) => ({
      ...gear.itemAttrs![0]!,
      statText: "Bonus experience",
      stats: [{ ...gear.itemAttrs![0]!.stats[0]!, stat: "bonus_experience", value, isPercent }],
    });
    gear.itemAttrs = [bonus(5, false)];
    gear.itemQualityAttrs = [
      { quality: "uncommon", attributes: [bonus(0.02, true)] },
      { quality: "rare", attributes: [bonus(1, false), bonus(0.01, true)] },
    ];
    const tiers = itemEffects(gear, NAMES)!.tiers.map((t) => t.effects.map((e) => `${e.stat} ${e.normal}`));
    expect(tiers).toEqual([
      ["Bonus experience +5", "Bonus experience +2%"],
      ["Bonus experience +6", "Bonus experience +3%"],
    ]);
  });

  it("sums repeated base lines into every tier, without float noise", () => {
    const gear = structuredClone(hatchet);
    const steps = (value: number) => ({
      ...gear.itemAttrs![0]!,
      statText: "Steps required",
      stats: [{ ...gear.itemAttrs![0]!.stats[0]!, stat: "steps_required", value, isPercent: false }],
    });
    gear.itemAttrs = [steps(0.1), steps(0.2)];
    gear.itemQualityAttrs = [{ quality: "uncommon", attributes: [steps(1)] }];
    const [uncommon] = itemEffects(gear, NAMES)!.tiers;
    expect(uncommon!.effects.map((e) => e.normal)).toEqual(["+1.3"]);
  });

  it("gives gear without tiers an empty tier list", () => {
    const ankh = (gearItems as unknown as ItemDetail[]).find((item) => item.id === "ancient_ankh")!;
    expect(itemEffects(ankh, NAMES)!.tiers).toEqual([]);
  });
});
