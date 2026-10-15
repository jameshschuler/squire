import { useMemo } from "react";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { SearchInput } from "@/components/shared/SearchInput";
import { SkillFilter } from "@/components/shared/SkillFilter";
import { useGameDataContext } from "@/contexts/game-data-context";
import { materialSkills, rawMaterials, searchMaterials, type Material } from "@/lib/materials";
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
  const materials = useMemo(() => (book ? rawMaterials(book) : NO_MATERIALS), [book]);
  const skills = useMemo(() => materialSkills(materials), [materials]);
  const results = useMemo(() => searchMaterials(materials, query, { skill }), [materials, query, skill]);
  const listKey = `materials|${skill ?? "all"}|${query}`;

  return (
    <div className="space-y-3 pt-3">
      <SearchInput value={query} placeholder="Search raw materials…" onChange={onQueryChange} />
      <SkillFilter skills={skills} selected={skill} onSelect={onSkillChange} />
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
