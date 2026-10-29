import { describe, expect, it } from "vitest";
import { stepsPerAction } from "../src/gear-data/steps.js";
import type { GearType } from "@walkscape-community/data-api-client";
import type { Character } from "../src/character/index.js";
import {
  BEST_IN_GAME,
  optimizeGear,
  type GearCondition,
  type GearData,
  type GearItem,
  type GearStat,
  type OptimizeTarget,
  type PlayerProfile,
  type GoalId,
  type Score,
  compareScores,
  goalScorer,
  setStats,
  wornSteps,
} from "../src/gear-data/index.js";

const stat = (stat: GearStat["stat"], value: number, isPercent: boolean, ...conditions: GearCondition[]): GearStat => ({
  stat,
  value,
  isPercent,
  conditions,
});
const efficiency = (value: number, ...conditions: GearCondition[]) =>
  stat("workEfficiency", value, true, ...conditions);
const flatSteps = (value: number, ...conditions: GearCondition[]) => stat("stepsRequired", value, false, ...conditions);
const doubleAction = (value: number) => stat("doubleAction", value, true);
const mainSkill = (skill: string): GearCondition => ({ type: "mainSkill", opposite: false, requirement: { skill } });

function item(id: string, slot: GearType, stats: GearStat[], extra: Partial<GearItem> = {}): GearItem {
  return {
    id,
    name: id,
    icon: "",
    quality: null,
    isCollectible: false,
    keywords: [],
    gameId: null,
    slot,
    requirements: [],
    stats,
    tierStats: {},
    ...extra,
  };
}

function gearData(items: GearItem[], extra: Partial<GearData> = {}): GearData {
  return {
    schema: 1,
    version: "v1",
    items,
    pets: [],
    bannedKeywords: {},
    skills: [
      { id: "mining", name: "Mining", type: "gathering" },
      { id: "cooking", name: "Cooking", type: "artisan" },
    ],
    locations: [],
    ...extra,
  };
}

function character(owned: string[], extra: Partial<Character> = {}): PlayerProfile {
  return {
    kind: "character",
    character: {
      name: "Test Walker",
      skillLevels: { mining: 50, cooking: 50 },
      totalSkillLevel: 100,
      lifetimeSteps: 0,
      characterLevel: 50,
      toolSlots: 3,
      achievementPoints: 0,
      collectibles: [],
      equipped: {},
      owned: owned.map((entry) => {
        const [item = "", count = "1"] = entry.split("*");
        const [id = "", quality] = item.split("@");
        return { id, quality: (quality as GearItem["quality"]) ?? null, count: Number(count) };
      }),
      pets: [],
      petOut: null,
      ...extra,
    },
  };
}

const mining: OptimizeTarget = {
  skill: "mining",
  level: 50,
  workRequired: 100,
  maxWorkEfficiency: 1.5,
  locationIds: [],
};
const picked = (gear: GearData, profile: PlayerProfile, target = mining) =>
  optimizeGear(gear, profile, target)
    .picks.map((p) => (p.quality ? `${p.item.id}@${p.quality}` : p.item.id))
    .sort();

describe("optimizeGear", () => {
  it("picks the item that cuts the most steps in a slot", () => {
    const gear = gearData([
      item("small_gloves", "hands", [flatSteps(-2)]),
      item("big_gloves", "hands", [flatSteps(-5)]),
    ]);
    const suggestion = optimizeGear(gear, BEST_IN_GAME, mining);
    expect(suggestion.picks.map((p) => p.item.id)).toEqual(["big_gloves"]);
    expect(suggestion.result.steps).toBe(75);
  });

  it("only counts an effect while doing its skill", () => {
    const gear = gearData([item("chef_hat", "head", [efficiency(0.2, mainSkill("cooking"))])]);
    expect(picked(gear, BEST_IN_GAME)).toEqual([]);
  });

  it("stops adding work efficiency past the activity's cap and cuts steps instead", () => {
    const gear = gearData([
      item("fast_gloves", "hands", [efficiency(0.3)]),
      item("light_gloves", "hands", [flatSteps(-3)]),
      item("pickaxe", "tool", [efficiency(0.25)]),
    ]);
    expect(
      picked(gear, character(["fast_gloves", "light_gloves", "pickaxe"], { skillLevels: { mining: 70 } })),
    ).toEqual(["light_gloves", "pickaxe"]);
  });

  it("never wears two tools that ban each other", () => {
    const hatchet = (id: string, value: number) => item(id, "tool", [flatSteps(value)], { keywords: ["hatchet"] });
    const gear = gearData(
      [hatchet("iron_hatchet", -3), hatchet("steel_hatchet", -4), item("watch", "tool", [flatSteps(-1)])],
      {
        bannedKeywords: { hatchet: ["hatchet"] },
      },
    );
    expect(picked(gear, BEST_IN_GAME)).toEqual(["steel_hatchet", "watch"]);
  });

  it("fills only the tool slots the character has", () => {
    const tools = [1, 2, 3, 4].map((n) => item(`tool_${n}`, "tool", [flatSteps(-n)]));
    expect(
      picked(
        gearData(tools),
        character(
          tools.map((t) => t.id),
          { toolSlots: 3 },
        ),
      ),
    ).toEqual(["tool_2", "tool_3", "tool_4"]);
  });

  it("wears two rings", () => {
    const rings = [1, 2, 3].map((n) => item(`ring_${n}`, "ring", [flatSteps(-n)]));
    expect(picked(gearData(rings), character(rings.map((r) => r.id)))).toEqual(["ring_2", "ring_3"]);
  });

  it("uses only gear the character owns, at the quality they own it", () => {
    const pickaxe = item("pickaxe", "tool", [flatSteps(-1)], {
      tierStats: { uncommon: [flatSteps(-1)], rare: [flatSteps(-1)] },
    });
    const suggestion = optimizeGear(
      gearData([pickaxe, item("unowned", "tool", [flatSteps(-9)])]),
      character(["pickaxe@uncommon"]),
      mining,
    );
    expect(suggestion.picks.map((p) => `${p.item.id}@${p.quality}`)).toEqual(["pickaxe@uncommon"]);
    expect(suggestion.totals.stepsFlat).toBe(-2);
  });

  it("assumes every item at its best quality when there's no character", () => {
    const pickaxe = item("pickaxe", "tool", [flatSteps(-1)], {
      tierStats: { uncommon: [flatSteps(-1)], ethereal: [flatSteps(-5)] },
    });
    const suggestion = optimizeGear(gearData([pickaxe]), BEST_IN_GAME, mining);
    expect(suggestion.picks[0]?.quality).toBe("ethereal");
    expect(suggestion.totals.stepsFlat).toBe(-7);
  });

  it("skips gear the character can't equip yet", () => {
    const locked = item("locked_boots", "feet", [flatSteps(-5)], {
      requirements: [{ type: "skillLevel", opposite: false, requirement: { skill: "mining", level: 80 } }],
    });
    expect(picked(gearData([locked]), character(["locked_boots"]))).toEqual([]);
    expect(picked(gearData([locked]), BEST_IN_GAME)).toEqual(["locked_boots"]);
  });

  it("wears two copies of a ring the character owns twice", () => {
    const rings = [item("good_ring", "ring", [flatSteps(-5)]), item("weak_ring", "ring", [flatSteps(-1)])];
    expect(picked(gearData(rings), character(["good_ring*2", "weak_ring"]))).toEqual(["good_ring", "good_ring"]);
  });

  it("wears at most two copies of a ring, however many the character owns", () => {
    expect(picked(gearData([item("good_ring", "ring", [flatSteps(-5)])]), character(["good_ring*5"]))).toEqual([
      "good_ring",
      "good_ring",
    ]);
  });

  it("wears one copy of a ring the character owns once", () => {
    const rings = [item("good_ring", "ring", [flatSteps(-5)]), item("weak_ring", "ring", [flatSteps(-1)])];
    expect(picked(gearData(rings), character(["good_ring", "weak_ring"]))).toEqual(["good_ring", "weak_ring"]);
  });

  it("assumes two of every ring with no character", () => {
    expect(picked(gearData([item("good_ring", "ring", [flatSteps(-5)])]), BEST_IN_GAME)).toEqual([
      "good_ring",
      "good_ring",
    ]);
  });

  it("never wears two copies of a tool", () => {
    expect(picked(gearData([item("watch", "tool", [flatSteps(-5)])]), character(["watch*3"]))).toEqual(["watch"]);
  });

  it("picks the location where location bonuses apply, and says which", () => {
    const gear = gearData(
      [
        item("snow_boots", "feet", [
          flatSteps(-5, { type: "locationHasKeywords", opposite: false, requirement: { keywords: ["snowy"] } }),
        ]),
      ],
      {
        locations: [
          { id: "beach", name: "Beach", region: "Jarvonia", realms: ["jarvonia"], keywords: [] },
          { id: "peak", name: "Peak", region: "Jarvonia", realms: ["jarvonia"], keywords: ["snowy"] },
        ],
      },
    );
    const suggestion = optimizeGear(gear, BEST_IN_GAME, { ...mining, locationIds: ["beach", "peak"] });
    expect(suggestion.location?.id).toBe("peak");
    expect(suggestion.picks.map((p) => p.item.id)).toEqual(["snow_boots"]);
  });

  it("counts a region bonus in a location's sub-region", () => {
    const gear = gearData(
      [
        item("trellin_badge", "neck", [
          flatSteps(-3, { type: "realm", opposite: false, requirement: { realm: "trellin" } }),
        ]),
      ],
      { locations: [{ id: "town", name: "Town", region: "GDTE", realms: ["gdte", "trellin"], keywords: [] }] },
    );
    expect(picked(gear, BEST_IN_GAME, { ...mining, locationIds: ["town"] })).toEqual(["trellin_badge"]);
  });

  it("counts a skill-type bonus for skills of that type", () => {
    const gear = gearData([
      item("gatherer_vest", "chest", [
        flatSteps(-3, { type: "mainSkillType", opposite: false, requirement: { type: "gathering" } }),
      ]),
    ]);
    expect(picked(gear, BEST_IN_GAME)).toEqual(["gatherer_vest"]);
    expect(picked(gear, BEST_IN_GAME, { ...mining, skill: "cooking" })).toEqual([]);
  });

  it("wears a set together when its bonus beats the single best pieces", () => {
    const setBonus = flatSteps(-6, {
      type: "distinctKeywordItemsEquipped",
      opposite: false,
      requirement: { quantity: 2, keywords: ["miner_set"] },
    });
    const gear = gearData([
      item("miner_helm", "head", [flatSteps(-1), setBonus], { keywords: ["miner_set"] }),
      item("miner_boots", "feet", [flatSteps(-1)], { keywords: ["miner_set"] }),
      item("good_helm", "head", [flatSteps(-4)]),
      item("good_boots", "feet", [flatSteps(-2)]),
    ]);
    expect(picked(gear, BEST_IN_GAME)).toEqual(["miner_boots", "miner_helm"]);
  });

  it("keeps a plain set piece when a later slot's set bonus needs it", () => {
    const gear = gearData([
      item("set_helm", "head", [], { keywords: ["miner_set"] }),
      item("plain_helm", "head", [flatSteps(-1)]),
      item(
        "set_boots",
        "feet",
        [
          flatSteps(-10, {
            type: "distinctKeywordItemsEquipped",
            opposite: false,
            requirement: { quantity: 2, keywords: ["miner_set"] },
          }),
        ],
        { keywords: ["miner_set"] },
      ),
    ]);
    expect(picked(gear, BEST_IN_GAME)).toEqual(["set_boots", "set_helm"]);
  });

  it("counts the same set item at two qualities as one piece", () => {
    const setBonus = flatSteps(-10, {
      type: "distinctKeywordItemsEquipped",
      opposite: false,
      requirement: { quantity: 2, keywords: ["ring_set"] },
    });
    const gear = gearData([item("set_ring", "ring", [setBonus], { keywords: ["ring_set"], tierStats: { epic: [] } })]);
    const suggestion = optimizeGear(gear, character(["set_ring@uncommon", "set_ring@epic"]), mining);
    expect(suggestion.totals.stepsFlat).toBe(0);
  });

  it("follows an equip requirement that applies below a level", () => {
    const beginner = item("beginner_boots", "feet", [flatSteps(-3)], {
      requirements: [{ type: "skillLevel", opposite: true, requirement: { skill: "mining", level: 60 } }],
    });
    expect(picked(gearData([beginner]), character(["beginner_boots"]))).toEqual(["beginner_boots"]);
    expect(picked(gearData([beginner]), character(["beginner_boots"], { skillLevels: { mining: 70 } }))).toEqual([]);
  });

  it("counts unknowable conditions as met with no character, and unmet for a character", () => {
    const gear = gearData([
      item("quest_ring", "ring", [
        flatSteps(-4, {
          type: "historyData",
          opposite: false,
          requirement: { category: "actionCompleted", value: 1, distinct: false },
        }),
      ]),
    ]);
    expect(picked(gear, BEST_IN_GAME)).toEqual(["quest_ring", "quest_ring"]);
    expect(picked(gear, character(["quest_ring"]))).toEqual([]);
  });

  it("checks a character's collectibles for collectible bonuses", () => {
    const gear = gearData([
      item("collector_cape", "cape", [
        flatSteps(-4, { type: "collectiblesOwned", opposite: false, requirement: { amount: 2 } }),
      ]),
    ]);
    expect(picked(gear, character(["collector_cape"], { collectibles: ["a"] }))).toEqual([]);
    expect(picked(gear, character(["collector_cape"], { collectibles: ["a", "b"] }))).toEqual(["collector_cape"]);
  });

  it("picks the best pet the character has, at its level", () => {
    const gear = gearData([], {
      pets: [
        {
          id: "mummy",
          name: "Mummy",
          rareId: "silky_mummy",
          icon: "",
          levels: [
            { level: 1, stats: [flatSteps(-1)] },
            { level: 4, stats: [flatSteps(-8)] },
          ],
        },
        {
          id: "camel",
          name: "Camel",
          rareId: "two_hump_camel",
          icon: "",
          levels: [{ level: 1, stats: [flatSteps(-3)] }],
        },
      ],
    });
    const owned = character([], {
      pets: [
        { species: "silky_mummy", level: 2 },
        { species: "camel", level: 1 },
      ],
    });
    expect(optimizeGear(gear, owned, mining).pet).toMatchObject({ pet: { id: "camel" }, level: 1 });
    expect(optimizeGear(gear, BEST_IN_GAME, mining).pet).toMatchObject({ pet: { id: "mummy" }, level: 4 });
  });

  it("weighs double action once steps can't go lower", () => {
    const gear = gearData([
      item("heavy_boots", "feet", [flatSteps(-200)]),
      item("lucky_charm", "neck", [doubleAction(0.5)]),
      item("lighter_charm", "neck", [flatSteps(-10)]),
    ]);
    const suggestion = optimizeGear(gear, BEST_IN_GAME, mining);
    expect(suggestion.picks.map((p) => p.item.id).sort()).toEqual(["heavy_boots", "lucky_charm"]);
    expect(suggestion.result).toMatchObject({ steps: 10, averageSteps: 10 / 1.5 });
  });

  it("leaves out gear that doesn't change the steps", () => {
    const gear = gearData([
      item("pickaxe", "tool", [efficiency(0.25)]),
      item("spare_pickaxe", "tool", [efficiency(0.25)]),
    ]);
    expect(picked(gear, character(["pickaxe", "spare_pickaxe"], { skillLevels: { mining: 70 } }))).toHaveLength(1);
  });

  it("fills slots that don't change steps with the second priority once efficiency is maxed", () => {
    const gear = gearData([
      item("pickaxe", "tool", [efficiency(0.25)]),
      item("lucky_hat", "head", [stat("chestFind", 0.3, true)]),
    ]);
    const walker = character(["pickaxe", "lucky_hat"], { skillLevels: { mining: 70 } });
    expect(picked(gear, walker)).toEqual(["pickaxe"]);
    expect(
      optimizeGear(gear, walker, mining, ["steps", "chests"])
        .picks.map((p) => p.item.id)
        .sort(),
    ).toEqual(["lucky_hat", "pickaxe"]);
  });

  it("trades steps for the first priority when it comes first", () => {
    const gear = gearData([
      item("fast_hat", "head", [flatSteps(-20)]),
      item("lucky_hat", "head", [stat("chestFind", 0.5, true)]),
    ]);
    expect(optimizeGear(gear, BEST_IN_GAME, mining, ["chests"]).picks.map((p) => p.item.id)).toEqual(["lucky_hat"]);
    expect(optimizeGear(gear, BEST_IN_GAME, mining, ["steps"]).picks.map((p) => p.item.id)).toEqual(["fast_hat"]);
  });

  it("saves materials first when asked, trading steps for it", () => {
    const gear = gearData([
      item("fast_gloves", "hands", [flatSteps(-20)]),
      item("thrifty_gloves", "hands", [stat("noMaterialsConsumed", 0.1, true)]),
    ]);
    expect(optimizeGear(gear, BEST_IN_GAME, mining, ["materials"]).picks.map((p) => p.item.id)).toEqual([
      "thrifty_gloves",
    ]);
  });

  it("counts quality outcome, a flat stat, for the best quality goal", () => {
    const gear = gearData([
      item("plain_apron", "chest", [stat("qualityOutcome", 10, false)]),
      item("fine_apron", "chest", [stat("qualityOutcome", 25, false)]),
    ]);
    const suggestion = optimizeGear(gear, BEST_IN_GAME, mining, ["quality", "steps"]);
    expect(suggestion.picks.map((p) => p.item.id)).toEqual(["fine_apron"]);
    expect(suggestion.score[0]).toBe(25);
  });

  it("suggests nothing when no gear helps", () => {
    const suggestion = optimizeGear(gearData([item("hat", "head", [])]), BEST_IN_GAME, mining);
    expect(suggestion).toMatchObject({ picks: [], pet: null, location: null });
    expect(suggestion.result.steps).toBe(80);
  });
});

describe("wornSteps", () => {
  const gear = gearData(
    [
      item("gloves", "hands", [flatSteps(-5)]),
      item("snow_boots", "feet", [
        flatSteps(-3, { type: "locationHasKeywords", opposite: false, requirement: { keywords: ["snowy"] } }),
      ]),
    ],
    {
      pets: [
        {
          id: "camel",
          name: "Camel",
          rareId: "two_hump_camel",
          icon: "",
          levels: [{ level: 1, stats: [flatSteps(-2)] }],
        },
      ],
    },
  );
  const peak = { id: "peak", name: "Peak", region: "Jarvonia", realms: ["jarvonia"], keywords: ["snowy"] };
  const wearing = (extra: Partial<Character>) => (character([], extra) as { character: Character }).character;

  it("counts the gear the character is wearing and the pet out", () => {
    const walker = wearing({
      equipped: { hands: { id: "gloves", quality: null } },
      petOut: { species: "two_hump_camel", level: 1 },
    });
    expect(wornSteps(gear, walker, mining, null).steps).toBe(93);
  });

  it("counts location bonuses only at a matching location", () => {
    const walker = wearing({ equipped: { feet: { id: "snow_boots", quality: null } } });
    expect(wornSteps(gear, walker, mining, null).steps).toBe(100);
    expect(wornSteps(gear, walker, mining, peak).steps).toBe(97);
  });

  it("ignores equipped items the gear data doesn't know", () => {
    const walker = wearing({ equipped: { head: { id: "mystery_hat", quality: null } } });
    expect(wornSteps(gear, walker, mining, null).steps).toBe(100);
  });
});

describe("setStats", () => {
  const chest = stat("chestFind", 0.1, true);
  const gear = gearData([
    item("miner_hat", "head", [flatSteps(-2), chest, efficiency(0.2, mainSkill("cooking"))], {
      keywords: ["miner_set"],
    }),
    item(
      "miner_boots",
      "feet",
      [
        chest,
        stat("doubleRewards", 0.05, true, {
          type: "distinctKeywordItemsEquipped",
          opposite: false,
          requirement: { quantity: 2, keywords: ["miner_set"] },
        }),
      ],
      { keywords: ["miner_set"] },
    ),
  ]);
  const stats = (ids: string[]) => {
    const suggestion = optimizeGear(gear, BEST_IN_GAME, mining);
    const picks = gear.items.filter((i) => ids.includes(i.id)).map((i) => ({ slot: i.slot, item: i, quality: null }));
    return setStats(gear, BEST_IN_GAME, mining, { ...suggestion, picks });
  };

  it("totals each stat the set gives, percent and flat apart, including ones that don't change steps", () => {
    expect(stats(["miner_hat", "miner_boots"])).toEqual(
      expect.arrayContaining([
        { stat: "stepsRequired", isPercent: false, value: -2 },
        { stat: "chestFind", isPercent: true, value: 0.2 },
        { stat: "doubleRewards", isPercent: true, value: 0.05 },
      ]),
    );
  });

  it("leaves out effects whose conditions don't hold", () => {
    expect(stats(["miner_hat"]).map((s) => s.stat)).not.toContain("workEfficiency");
  });

  it("counts a set bonus only with enough set pieces", () => {
    expect(stats(["miner_boots"]).map((s) => s.stat)).toEqual(["chestFind"]);
  });
});

describe("optimizeGear against every possible set", () => {
  function random(seed: number) {
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) % 2 ** 31;
      return state / 2 ** 31;
    };
  }

  function randomGear(next: () => number): GearItem[] {
    const slots: GearType[] = ["head", "feet", "hands", "ring", "ring", "ring", "tool", "tool", "tool", "tool", "tool"];
    return slots.map((slot, i) => {
      const stats = [
        efficiency(Math.round(next() * 30) / 100),
        flatSteps(-Math.round(next() * 6)),
        stat("stepsRequired", -Math.round(next() * 10) / 100, true),
        doubleAction(Math.round(next() * 20) / 100),
        stat("chestFind", Math.round(next() * 40) / 100, true),
      ].filter(() => next() < 0.5);
      const inSet = next() < 0.6;
      if (inSet && next() < 0.7) {
        const condition: GearCondition = {
          type: "distinctKeywordItemsEquipped",
          opposite: false,
          requirement: { quantity: next() < 0.5 ? 2 : 3, keywords: ["set"] },
        };
        const bonuses = [
          flatSteps(-3 - Math.round(next() * 7), condition),
          efficiency(Math.round(next() * 30) / 100, condition),
          stat("doubleAction", Math.round(next() * 30) / 100, true, condition),
          stat("chestFind", Math.round(next() * 30) / 100, true, condition),
        ];
        stats.push(bonuses[Math.floor(next() * bonuses.length)]!);
      }
      const keywords = [...(inSet ? ["set"] : []), ...(slot === "tool" && next() < 0.5 ? ["hatchet"] : [])];
      return item(`item_${i}`, slot, stats, { keywords });
    });
  }

  function bruteForce(gear: GearData, target: OptimizeTarget, level: number, goals: GoalId[]): Score {
    const bySlot = (slot: GearType) => gear.items.filter((i) => i.slot === slot);
    const subsets = (items: GearItem[], max: number): GearItem[][] =>
      items.reduce<GearItem[][]>(
        (sets, it) => [...sets, ...sets.filter((set) => set.length < max).map((set) => [...set, it])],
        [[]],
      );
    const options = [
      ...[bySlot("head"), bySlot("feet"), bySlot("hands")].map((items) => [[], ...items.map((it) => [it])]),
      subsets(bySlot("ring"), 2),
      subsets(bySlot("tool"), 3),
    ];
    const combos = options.reduce<GearItem[][]>(
      (acc, choices) => acc.flatMap((set) => choices.map((choice) => [...set, ...choice])),
      [[]],
    );
    return combos
      .filter((set) => set.filter((it) => it.keywords.includes("hatchet")).length <= 1)
      .map((set) => {
        const setCount = set.filter((it) => it.keywords.includes("set")).length;
        const totals = set
          .flatMap((it) => it.stats)
          .filter((s) =>
            s.conditions.every((c) => c.type !== "distinctKeywordItemsEquipped" || setCount >= c.requirement.quantity),
          )
          .reduce(
            (sum, s) => ({
              workEfficiency: sum.workEfficiency + (s.stat === "workEfficiency" ? s.value : 0),
              stepsPercent: sum.stepsPercent + (s.stat === "stepsRequired" && s.isPercent ? s.value : 0),
              stepsFlat: sum.stepsFlat + (s.stat === "stepsRequired" && !s.isPercent ? s.value : 0),
              doubleAction: sum.doubleAction + (s.stat === "doubleAction" ? s.value : 0),
              goalStats: [sum.goalStats[0]! + (s.stat === "chestFind" ? s.value : 0)],
            }),
            { workEfficiency: 0, stepsPercent: 0, stepsFlat: 0, doubleAction: 0, goalStats: [0] },
          );
        return goalScorer(goals)(stepsPerAction(target, level, totals), totals);
      })
      .reduce((best, next) => (compareScores(next, best) > 0 ? next : best));
  }

  it.each([
    ["fewest steps", ["steps"]],
    ["fewest steps, then most chests", ["steps", "chests"]],
    ["most chests, then fewest steps", ["chests", "steps"]],
  ] as [string, GoalId[]][])("finds a set as good as the best one for %s on 300 random gear pools", (_, goals) => {
    const next = random(42);
    for (let run = 0; run < 300; run++) {
      const items = randomGear(next);
      const gear = gearData(items, { bannedKeywords: { hatchet: ["hatchet"] } });
      const level = 50 + Math.round(next() * 30);
      const target = { ...mining, workRequired: 40 + Math.round(next() * 200) };
      const profile = character(
        items.map((i) => i.id),
        { skillLevels: { mining: level } },
      );
      const found = optimizeGear(gear, profile, target, goals).score;
      expect(compareScores(found, bruteForce(gear, target, level, goals)), `run ${run}`).toBe(0);
    }
  });
});
