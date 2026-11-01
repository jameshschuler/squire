import type { GearType } from "@walkscape-community/data-api-client";
import type { GearNeed } from "../recipe-book/types.js";
import { setCount, type Candidate } from "./candidates.js";
import type { OwnedGear } from "./profile.js";
import type { GearItem } from "./types.js";

// A need the search must meet: at least `count` different worn items with `keyword`, which is set
// group `group` in the keyword rules.
export interface NeedRule {
  keyword: string;
  count: number;
  group: number;
}

export function meetsNeeds(set: Candidate[], needs: NeedRule[]): boolean {
  return needs.every(({ keyword, count }) => setCount(set, [keyword]) >= count);
}

// Whether these worn items meet the need, for checking a finished set.
export function metBy(need: GearNeed, items: GearItem[]): boolean {
  return new Set(items.filter((item) => fillsNeed(need, item)).map((item) => item.id)).size >= need.count;
}

// Items that can fill a need carry its keyword, so pruning and the search count them like set pieces:
// they're never pruned away, and two copies of one item count once.
export function needKeyword(index: number): string {
  return `need:${index}`;
}

export function fillsNeed(need: GearNeed, item: GearItem): boolean {
  if (need.itemId) {
    return item.id === need.itemId;
  }

  const { level } = need;

  return (
    need.keywords.some((keyword) => item.keywords.includes(keyword)) &&
    (!level || equipLevel(item, level.skill) >= level.level)
  );
}

// Whether the owned gear can meet the need: enough different items that fill it, counting only as
// many per slot as the slot holds.
export function canMeetNeed(need: GearNeed, owned: OwnedGear[], capacityOf: (slot: GearType) => number): boolean {
  const idsBySlot = new Map<GearType, Set<string>>();
  for (const { item } of owned.filter((entry) => fillsNeed(need, entry.item))) {
    idsBySlot.set(item.slot, (idsBySlot.get(item.slot) ?? new Set()).add(item.id));
  }

  const wearable = [...idsBySlot].reduce((sum, [slot, ids]) => sum + Math.min(ids.size, capacityOf(slot)), 0);

  return wearable >= need.count;
}

export function withNeedKeywords(candidate: Candidate, item: GearItem, needs: GearNeed[]): Candidate {
  const keywords = needs.flatMap((need, index) => (fillsNeed(need, item) ? [needKeyword(index)] : []));

  return keywords.length > 0 ? { ...candidate, keywords: [...candidate.keywords, ...keywords] } : candidate;
}

function equipLevel(item: GearItem, skill: string): number {
  const requirement = item.requirements.find(
    (condition) => condition.type === "skillLevel" && condition.requirement.skill === skill,
  );

  return requirement?.type === "skillLevel" ? requirement.requirement.level : 0;
}
