import { useMemo } from "react";
import type { ItemSummary } from "@squire/api/recipe-book";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { SearchInput } from "@/components/shared/SearchInput";
import { SkillFilter } from "@/components/shared/SkillFilter";
import { useGameDataContext } from "@/contexts/game-data-context";
import { effectFilters, searchEffectItems } from "@/lib/effect-items";
import { knownOption } from "@/lib/skills";
import { EffectItemResults } from "./EffectItemResults";

const NO_ITEMS: ItemSummary[] = [];

interface EffectItemSearchProps {
  kind: "foods" | "loot";
  noun: string;
  query: string;
  skill: string | undefined;
  onQueryChange: (query: string) => void;
  onSkillChange: (skill: string | undefined) => void;
}

export function EffectItemSearch({ kind, noun, query, skill, onQueryChange, onSkillChange }: EffectItemSearchProps) {
  const state = useGameDataContext();
  const items = state.status === "ready" ? state.book[kind] : NO_ITEMS;
  const filters = useMemo(() => effectFilters(items), [items]);
  const filter = knownOption(filters, skill);
  const results = useMemo(() => searchEffectItems(items, query, { filter }), [items, query, filter]);
  const listKey = `${kind}|${filter ?? "all"}|${query}`;

  return (
    <div className="space-y-3 pt-3">
      <SearchInput value={query} placeholder={`Search ${noun}…`} onChange={onQueryChange} />
      <SkillFilter skills={filters} selected={filter} onSelect={onSkillChange} />
      {state.status !== "ready" ? (
        <GameDataStatus state={state} />
      ) : results.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No {noun} matches.</p>
      ) : (
        <EffectItemResults
          key={listKey}
          listKey={listKey}
          items={results}
          filter={filter}
          showQuality={kind === "loot"}
        />
      )}
    </div>
  );
}
