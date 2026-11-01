import { itemId, type Candidate } from "./candidates.js";
import { needKeyword, type NeedRule } from "./needs.js";
import { MAX_DOUBLE_ACTION, type StatTotals } from "./steps.js";

// `banKeys` are every keyword that takes part in a ban. `setGroups` are the keyword lists the search
// counts distinct items for: set bonuses, then needs. `cappedSetGroups` are the set groups with a
// "fewer than N pieces" bonus, where more pieces can hurt. `needs` are the gear the activity requires.
export interface KeywordRules {
  bannedKeywords: Record<string, string[]>;
  banKeys: Set<string>;
  setGroups: string[][];
  cappedSetGroups: Set<number>;
  needs: NeedRule[];
}

// `needCounts` are how many different items each need requires; candidates that fill need i carry needKeyword(i).
export function keywordRules(
  bannedKeywords: Record<string, string[]>,
  candidates: Candidate[],
  needCounts: number[],
): KeywordRules {
  const conditions = candidates.flatMap((candidate) => candidate.setBonuses.flatMap((setBonus) => setBonus.conditions));
  const groups = [...new Set(conditions.map((condition) => JSON.stringify(condition.requirement.keywords)))];
  const capped = new Set(
    conditions
      .filter((condition) => condition.opposite)
      .map((condition) => JSON.stringify(condition.requirement.keywords)),
  );
  const needs = needCounts.map((count, index) => ({
    keyword: needKeyword(index),
    count,
    group: groups.length + index,
  }));

  return {
    bannedKeywords,
    banKeys: new Set([...Object.keys(bannedKeywords), ...Object.values(bannedKeywords).flat()]),
    setGroups: [...groups.map((group) => JSON.parse(group) as string[]), ...needs.map((need) => [need.keyword])],
    cappedSetGroups: new Set(groups.flatMap((group, index) => (capped.has(group) ? [index] : []))),
    needs,
  };
}

// Ban keywords as bits. `keys` are the item's own; `clashes` are the bits that can't be worn alongside
// it, in either direction. A set clashes with an item when its keys overlap the item's clashes.
export interface BanMasks {
  keys: bigint;
  clashes: bigint;
}

export function banMasks({ banKeys, bannedKeywords }: KeywordRules): (candidate: Candidate) => BanMasks {
  const bits = new Map([...banKeys].map((key, index) => [key, 1n << BigInt(index)]));
  const maskOf = (keywords: string[]) => keywords.reduce((mask, keyword) => mask | (bits.get(keyword) ?? 0n), 0n);

  return ({ keywords }) => {
    const own = new Set(keywords);

    return {
      keys: maskOf(keywords),
      clashes: maskOf([
        ...keywords.flatMap((keyword) => bannedKeywords[keyword] ?? []),
        ...Object.entries(bannedKeywords).flatMap(([key, banned]) =>
          banned.some((bannedKeyword) => own.has(bannedKeyword)) ? [key] : [],
        ),
      ]),
    };
  };
}

export function clashes(wornKeys: bigint, next: BanMasks): boolean {
  return (wornKeys & next.clashes) !== 0n;
}

export function setGroupsOf({ setGroups }: KeywordRules, candidate: Candidate): number[] {
  const own = new Set(candidate.keywords);

  return setGroups.flatMap((keywords, index) => (keywords.some((keyword) => own.has(keyword)) ? [index] : []));
}

export function conflicts(
  { bannedKeywords }: Pick<KeywordRules, "bannedKeywords">,
  left: Pick<Candidate, "keywords">,
  right: Pick<Candidate, "keywords">,
): boolean {
  const bans = (from: string[], to: string[]) => {
    const targets = new Set(to);

    return from.some((keyword) => bannedKeywords[keyword]?.some((banned) => targets.has(banned)));
  };

  return bans(left.keywords, right.keywords) || bans(right.keywords, left.keywords);
}

// Drops items that can never be worth wearing: ones that help nothing here, and ones beaten outright by
// at least `capacity` others in the same slot (so a better item is always free to wear instead).
export function prune(choices: Candidate[], capacity: number, rules: KeywordRules, useful: number): Candidate[] {
  const keys = new Map(
    choices.map((choice) => [
      choice,
      {
        ban: choice.keywords.filter((keyword) => rules.banKeys.has(keyword)),
        banned: new Set(choice.keywords.filter((keyword) => rules.banKeys.has(keyword))),
        set: new Set(setGroupsOf(rules, choice)),
      },
    ]),
  );
  const efficiency = (value: number) => Math.min(value, useful);
  const kept = choices.filter(
    (choice) => choice.setBonuses.length > 0 || keys.get(choice)!.set.size > 0 || helps(choice.best, useful),
  );
  const covers = (candidate: Candidate, other: Candidate) => {
    const [candidateKeys, otherKeys] = [keys.get(candidate)!, keys.get(other)!];

    return (
      efficiency(candidate.worst.workEfficiency) >= efficiency(other.best.workEfficiency) &&
      candidate.worst.stepsPercent <= other.best.stepsPercent &&
      candidate.worst.stepsFlat <= other.best.stepsFlat &&
      Math.min(candidate.worst.doubleAction, MAX_DOUBLE_ACTION) >=
        Math.min(other.best.doubleAction, MAX_DOUBLE_ACTION) &&
      other.best.goalStats.every((value, index) => (candidate.worst.goalStats[index] ?? 0) >= value) &&
      candidateKeys.ban.every((keyword) => otherKeys.banned.has(keyword)) &&
      [...otherKeys.set].every((group) => candidateKeys.set.has(group)) &&
      [...rules.cappedSetGroups].every(
        (cappedSetGroup) => candidateKeys.set.has(cappedSetGroup) === otherKeys.set.has(cappedSetGroup),
      )
    );
  };

  const dominates = (candidate: Candidate, other: Candidate) =>
    covers(candidate, other) && (!covers(other, candidate) || candidate.id < other.id);

  // Set bonuses count distinct items, so two copies of one ring are only one set piece: a set piece is
  // only dropped when enough different items beat it.
  const beaten = (candidate: Candidate) => {
    const winners = kept.filter((other) => other !== candidate && dominates(other, candidate));

    return keys.get(candidate)!.set.size > 0 ? new Set(winners.map(itemId)).size : winners.length;
  };

  return kept.filter((candidate) => beaten(candidate) < capacity);
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
