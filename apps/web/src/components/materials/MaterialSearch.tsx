import { useMemo } from "react";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { SearchInput } from "@/components/shared/SearchInput";
import { SkillFilter } from "@/components/shared/SkillFilter";
import { useGameDataContext } from "@/contexts/game-data-context";
import { listMaterials, materialFilters, searchMaterials, type Material } from "@/lib/materials";
import { knownOption } from "@/lib/skills";
import { MaterialResults } from "./MaterialResults";

const NO_MATERIALS: Material[] = [];

interface MaterialSearchProps {
  query: string;
  skill: string | undefined;
  onQueryChange: (query: string) => void;
  onSkillChange: (skill: string | undefined) => void;
}

export function MaterialSearch({ query, skill, onQueryChange, onSkillChange }: MaterialSearchProps) {
  const state = useGameDataContext();
  const book = state.status === "ready" ? state.book : undefined;
  const materials = useMemo(() => (book ? listMaterials(book) : NO_MATERIALS), [book]);
  const filters = useMemo(() => materialFilters(materials), [materials]);
  const filter = knownOption(filters, skill);
  const results = useMemo(() => searchMaterials(materials, query, { filter }), [materials, query, filter]);
  const listKey = `materials|${filter ?? "all"}|${query}`;

  return (
    <div className="space-y-3 pt-3">
      <SearchInput value={query} placeholder="Search materials…" onChange={onQueryChange} />
      <SkillFilter skills={filters} selected={filter} onSelect={onSkillChange} />
      {state.status !== "ready" ? (
        <GameDataStatus state={state} />
      ) : results.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No materials match.</p>
      ) : (
        <MaterialResults key={listKey} listKey={listKey} materials={results} />
      )}
    </div>
  );
}
