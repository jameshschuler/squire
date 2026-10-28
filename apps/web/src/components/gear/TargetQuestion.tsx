import { useMemo, useState } from "react";
import { GameIcon } from "@/components/shared/GameIcon";
import { SearchInput } from "@/components/shared/SearchInput";
import { formatSkillLevel } from "@/lib/format";
import { searchGearTargets, type GearTarget } from "@/lib/gear-targets";

interface TargetQuestionProps {
  targets: GearTarget[];
  onChoose: (key: string) => void;
}

export function TargetQuestion({ targets, onChoose }: TargetQuestionProps) {
  const [query, setQuery] = useState("");
  const suggestions = useMemo(() => searchGearTargets(targets, query), [targets, query]);
  return (
    <div className="space-y-2">
      <SearchInput value={query} placeholder="Search activities and recipes…" onChange={setQuery} />
      {suggestions.length > 0 && (
        <ul className="divide-y rounded-md border bg-background">
          {suggestions.map((target) => (
            <li key={target.key}>
              <button
                type="button"
                onClick={() => onChoose(target.key)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left"
              >
                <GameIcon path={target.icon} />
                <span className="min-w-0">
                  <span className="block font-medium">{target.name}</span>
                  <span className="block text-sm text-muted-foreground">{formatSkillLevel(target.skill)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && suggestions.length === 0 && (
        <p className="text-sm text-muted-foreground">No activity or recipe matches.</p>
      )}
    </div>
  );
}
