import type { GearType } from "@walkscape-community/data-api-client";
import { conditionHolds, withSetBonuses, type Candidate, type Situation } from "./candidates.js";
import { compareScores, type Score } from "./goals.js";
import type { OwnedGear } from "./profile.js";
import { conflicts, type KeywordRules } from "./pruning.js";
import { STEP_STATS, type StatTotals } from "./steps.js";
import { copiesAllowed } from "./slots.js";
import type { GearStat } from "./types.js";

export interface FreeSlotChoice {
  owned: OwnedGear;
  candidate: Candidate;
}

// After the search, fills empty places with owned items that add other bonuses (inventory space, gem
// finding…) without costing steps. Items with the most bonuses go first, and each is kept only if the
// set still fits its slots, copies and bans and scores no lower.
export function fillFreeSlots(
  situation: Situation,
  chosen: Candidate[],
  choices: FreeSlotChoice[],
  capacityOf: (slot: GearType) => number,
  rules: KeywordRules,
  score: (totals: StatTotals) => Score,
): Candidate[] {
  const target = score(withSetBonuses(chosen));
  const fits = (filled: Candidate[], { candidate, owned }: FreeSlotChoice) =>
    filled.filter((c) => c.slot === owned.item.slot).length < capacityOf(owned.item.slot) &&
    filled.filter((c) => c.pick?.item.id === owned.item.id).length < copiesAllowed(owned.item.slot) &&
    !filled.some((other) => other === candidate || conflicts(rules, other, candidate));
  return choices
    .filter(({ candidate }) => costsNoSteps(candidate.totals))
    .map((choice) => ({ choice, bonus: otherBonuses(situation, choice.owned.stats) }))
    .filter(({ bonus }) => bonus.length > 0 && bonus.every((stat) => stat.value > 0))
    .sort(
      (a, b) =>
        b.bonus.length - a.bonus.length ||
        total(b.bonus, true) - total(a.bonus, true) ||
        total(b.bonus, false) - total(a.bonus, false),
    )
    .reduce((filled, { choice }) => {
      if (!fits(filled, choice)) {
        return filled;
      }
      const next = [...filled, choice.candidate];
      return compareScores(score(withSetBonuses(next)), target) >= 0 ? next : filled;
    }, chosen);
}

function costsNoSteps({ workEfficiency, stepsPercent, stepsFlat, doubleAction }: StatTotals): boolean {
  return workEfficiency >= 0 && stepsPercent <= 0 && stepsFlat <= 0 && doubleAction >= 0;
}

function otherBonuses(situation: Situation, stats: GearStat[]): GearStat[] {
  return stats.filter(
    (stat) =>
      !(STEP_STATS as readonly string[]).includes(stat.stat) &&
      stat.conditions.every((c) => c.type !== "distinctKeywordItemsEquipped" && conditionHolds(situation, c)),
  );
}

function total(bonuses: GearStat[], isPercent: boolean): number {
  return bonuses.filter((stat) => stat.isPercent === isPercent).reduce((sum, stat) => sum + stat.value, 0);
}
