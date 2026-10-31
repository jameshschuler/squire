import type { Candidate } from "./candidates.js";
import { MAX_DOUBLE_ACTION, type StatTotals } from "./steps.js";

export interface KeywordRules {
  bannedKeywords: Record<string, string[]>;
  banKeys: Set<string>;
  setGroups: string[][];
}

export function keywordRules(bannedKeywords: Record<string, string[]>, candidates: Candidate[]): KeywordRules {
  return {
    bannedKeywords,
    banKeys: new Set([...Object.keys(bannedKeywords), ...Object.values(bannedKeywords).flat()]),
    setGroups: [
      ...new Set(
        candidates.flatMap((c) =>
          c.setBonuses.flatMap((b) => b.conditions.map((s) => JSON.stringify(s.requirement.keywords))),
        ),
      ),
    ].map((group) => JSON.parse(group) as string[]),
  };
}

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
      [...bKeys.set].every((k) => aKeys.set.has(k))
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
