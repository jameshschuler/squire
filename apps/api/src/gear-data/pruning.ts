import type { Candidate } from "./candidates.js";
import { MAX_DOUBLE_ACTION, type StatTotals } from "./steps.js";

// `banKeys` are every keyword that takes part in a ban. `setGroups` are the keyword lists set bonuses
// count, and `cappedSetGroups` the ones with a "fewer than N pieces" bonus, where more pieces can hurt.
export interface KeywordRules {
  bannedKeywords: Record<string, string[]>;
  banKeys: Set<string>;
  setGroups: string[][];
  cappedSetGroups: Set<number>;
}

export function keywordRules(bannedKeywords: Record<string, string[]>, candidates: Candidate[]): KeywordRules {
  const conditions = candidates.flatMap((c) => c.setBonuses.flatMap((b) => b.conditions));
  const groups = [...new Set(conditions.map((s) => JSON.stringify(s.requirement.keywords)))];
  const capped = new Set(conditions.filter((s) => s.opposite).map((s) => JSON.stringify(s.requirement.keywords)));
  return {
    bannedKeywords,
    banKeys: new Set([...Object.keys(bannedKeywords), ...Object.values(bannedKeywords).flat()]),
    setGroups: groups.map((group) => JSON.parse(group) as string[]),
    cappedSetGroups: new Set(groups.flatMap((group, i) => (capped.has(group) ? [i] : []))),
  };
}

// Ban keywords as bits. `keys` are the item's own; `clashes` are the bits that can't be worn alongside
// it, in either direction. A set clashes with an item when its keys overlap the item's clashes.
export interface BanMasks {
  keys: bigint;
  clashes: bigint;
}

export function banMasks({ banKeys, bannedKeywords }: KeywordRules): (candidate: Candidate) => BanMasks {
  const bits = new Map([...banKeys].map((key, i) => [key, 1n << BigInt(i)]));
  const maskOf = (keywords: string[]) => keywords.reduce((mask, k) => mask | (bits.get(k) ?? 0n), 0n);
  return ({ keywords }) => ({
    keys: maskOf(keywords),
    clashes: maskOf([
      ...keywords.flatMap((k) => bannedKeywords[k] ?? []),
      ...Object.entries(bannedKeywords).flatMap(([k, banned]) => (banned.some((x) => keywords.includes(x)) ? [k] : [])),
    ]),
  });
}

export function clashes(wornKeys: bigint, next: BanMasks): boolean {
  return (wornKeys & next.clashes) !== 0n;
}

export function setGroupsOf({ setGroups }: KeywordRules, candidate: Candidate): number[] {
  return setGroups.flatMap((keywords, i) => (candidate.keywords.some((k) => keywords.includes(k)) ? [i] : []));
}

export function conflicts(
  { bannedKeywords }: Pick<KeywordRules, "bannedKeywords">,
  a: Pick<Candidate, "keywords">,
  b: Pick<Candidate, "keywords">,
): boolean {
  const bans = (from: string[], to: string[]) => from.some((k) => bannedKeywords[k]?.some((x) => to.includes(x)));
  return bans(a.keywords, b.keywords) || bans(b.keywords, a.keywords);
}

// Drops items that can never be worth wearing: ones that help nothing here, and ones beaten outright by
// at least `capacity` others in the same slot (so a better item is always free to wear instead).
export function prune(choices: Candidate[], capacity: number, rules: KeywordRules, useful: number): Candidate[] {
  const keys = new Map(
    choices.map((c) => [
      c,
      {
        ban: c.keywords.filter((k) => rules.banKeys.has(k)),
        set: new Set(setGroupsOf(rules, c)),
      },
    ]),
  );
  const efficiency = (value: number) => Math.min(value, useful);
  const kept = choices.filter((c) => c.setBonuses.length > 0 || keys.get(c)!.set.size > 0 || helps(c.best, useful));
  const covers = (a: Candidate, b: Candidate) => {
    const [aKeys, bKeys] = [keys.get(a)!, keys.get(b)!];
    return (
      efficiency(a.totals.workEfficiency) >= efficiency(b.best.workEfficiency) &&
      a.totals.stepsPercent <= b.best.stepsPercent &&
      a.totals.stepsFlat <= b.best.stepsFlat &&
      Math.min(a.totals.doubleAction, MAX_DOUBLE_ACTION) >= Math.min(b.best.doubleAction, MAX_DOUBLE_ACTION) &&
      b.best.goalStats.every((value, i) => (a.totals.goalStats[i] ?? 0) >= value) &&
      aKeys.ban.every((k) => bKeys.ban.includes(k)) &&
      [...bKeys.set].every((k) => aKeys.set.has(k)) &&
      [...rules.cappedSetGroups].every((g) => aKeys.set.has(g) === bKeys.set.has(g))
    );
  };
  const dominates = (a: Candidate, b: Candidate) => covers(a, b) && (!covers(b, a) || a.id < b.id);
  return kept.filter((c) => kept.filter((other) => other !== c && dominates(other, c)).length < capacity);
}

function helps(totals: StatTotals, useful: number): boolean {
  return (
    (totals.workEfficiency > 0 && useful > 0) ||
    totals.stepsPercent < 0 ||
    totals.stepsFlat < 0 ||
    totals.doubleAction > 0 ||
    totals.goalStats.some((value) => value > 0)
  );
}
