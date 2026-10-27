import type { GearType } from "@walkscape-community/data-api-client";
import type { ItemQuality } from "../recipe-book/types.js";
import { playerConditionHolds, type OwnedPetView, type PlayerProfile } from "./profile.js";
import { NO_STATS, addStats, type StatTotals, type WorkTarget } from "./steps.js";
import type { GearCondition, GearItem, GearStat, LocationView } from "./types.js";

export interface GearPick {
  slot: GearType;
  item: GearItem;
  quality: ItemQuality | null;
}

type SetCondition = Extract<GearCondition, { type: "distinctKeywordItemsEquipped" }>;

export interface SetBonus {
  conditions: SetCondition[];
  totals: StatTotals;
}

export interface Candidate {
  id: string;
  slot: GearType | "pet";
  keywords: string[];
  pick: GearPick | null;
  pet: OwnedPetView | null;
  totals: StatTotals;
  setBonuses: SetBonus[];
  best: StatTotals;
}

export interface Situation {
  target: WorkTarget;
  skillType: string;
  location: LocationView | null;
  profile: PlayerProfile;
}

type CandidateBase = Omit<Candidate, "totals" | "setBonuses" | "best">;

export function toCandidate(situation: Situation, base: CandidateBase, stats: GearStat[]): Candidate {
  let totals = NO_STATS;
  const setBonuses: SetBonus[] = [];
  for (const stat of stats) {
    const contribution = statTotals(stat);
    const setConditions = stat.conditions.filter((c): c is SetCondition => c.type === "distinctKeywordItemsEquipped");
    const others = stat.conditions.filter((c) => c.type !== "distinctKeywordItemsEquipped");
    if (contribution === NO_STATS || !others.every((condition) => conditionHolds(situation, condition))) {
      continue;
    }
    if (setConditions.length > 0) {
      setBonuses.push({ conditions: setConditions, totals: contribution });
    } else {
      totals = addStats(totals, contribution);
    }
  }
  const best = setBonuses.reduce((sum, bonus) => addStats(sum, gains(bonus.totals)), totals);
  return { ...base, totals, setBonuses, best };
}

export function itemId(candidate: Candidate): string {
  return candidate.pick?.item.id ?? candidate.id;
}

export function setCount(chosen: Candidate[], keywords: string[]): number {
  return new Set(chosen.filter((c) => c.keywords.some((k) => keywords.includes(k))).map(itemId)).size;
}

export function withSetBonuses(chosen: Candidate[]): StatTotals {
  return chosen.reduce((sum, c) => {
    const active = c.setBonuses.filter((bonus) =>
      bonus.conditions.every((s) => setCount(chosen, s.requirement.keywords) >= s.requirement.quantity !== s.opposite),
    );
    return active.reduce((total, bonus) => addStats(total, bonus.totals), addStats(sum, c.totals));
  }, NO_STATS);
}

function statTotals(stat: GearStat): StatTotals {
  switch (stat.stat) {
    case "workEfficiency":
      return { ...NO_STATS, workEfficiency: stat.value };
    case "stepsRequired":
      return stat.isPercent ? { ...NO_STATS, stepsPercent: stat.value } : { ...NO_STATS, stepsFlat: stat.value };
    case "doubleAction":
      return { ...NO_STATS, doubleAction: stat.value };
    default:
      return NO_STATS;
  }
}

function conditionHolds(situation: Situation, condition: GearCondition): boolean {
  const holds = situationHolds(situation, condition) ?? playerConditionHolds(situation.profile, condition);
  return (holds ?? false) !== condition.opposite;
}

function situationHolds({ target, skillType, location }: Situation, condition: GearCondition): boolean | undefined {
  switch (condition.type) {
    case "mainSkill":
      return condition.requirement.skill === target.skill;
    case "mainSkillType":
      return condition.requirement.type === skillType;
    case "traveling":
      return false;
    case "realm":
      return location?.realms.includes(condition.requirement.realm) ?? false;
    case "locationHasKeywords":
      return condition.requirement.keywords.some((keyword) => location?.keywords.includes(keyword) ?? false);
    default:
      return undefined;
  }
}

function gains(totals: StatTotals): StatTotals {
  return {
    workEfficiency: Math.max(totals.workEfficiency, 0),
    stepsPercent: Math.min(totals.stepsPercent, 0),
    stepsFlat: Math.min(totals.stepsFlat, 0),
    doubleAction: Math.max(totals.doubleAction, 0),
  };
}
