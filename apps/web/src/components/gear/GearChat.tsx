import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import type { RecipeBook } from "@squire/api/recipe-book";
import { BEST_IN_GAME, type GearData, type PlayerProfile } from "@squire/api/gear-data";
import { Button } from "@/components/ui/button";
import { useCharacterContext } from "@/contexts/character-context";
import { useGearSuggestion } from "@/hooks/useGearSuggestion";
import {
  BEST_LOCATION,
  gearTargets,
  goalsFor,
  locationLabel,
  optimizeTarget,
  recommendedGoals,
  tieBreakersFor,
} from "@/lib/gear-targets";
import { MAX_GOALS, parseGoals, type GearSearch } from "@/lib/gear-search";
import { ChatAnswer } from "./ChatAnswer";
import { ChatMessage } from "./ChatMessage";
import { LocationQuestion } from "./LocationQuestion";
import { PriorityQuestion } from "./PriorityQuestion";
import { GearResult } from "./GearResult";
import { NoCharacterNote } from "./NoCharacterNote";
import { TargetQuestion } from "./TargetQuestion";

interface GearChatProps {
  book: RecipeBook;
  gear: GearData;
  search: GearSearch;
  onSearchChange: (search: GearSearch) => void;
}

export function GearChat({ book, gear, search, onSearchChange }: GearChatProps) {
  const { character } = useCharacterContext();
  const targets = useMemo(() => gearTargets(book), [book]);
  const target = targets.find((t) => t.key === search.target);
  const askLocation = (target?.locations.length ?? 0) > 1;
  const location =
    search.location === BEST_LOCATION || target?.locations.some((l) => l.id === search.location)
      ? search.location
      : undefined;
  const locationAnswered = !askLocation || location !== undefined;
  const allowedGoals = useMemo(() => (target ? goalsFor(target) : []), [target]);
  const goals = useMemo(
    () =>
      parseGoals(
        search.goals,
        allowedGoals.map((g) => g.id),
      ),
    [search.goals, allowedGoals],
  );
  const profile = useMemo<PlayerProfile>(
    () => (character ? { kind: "character", character } : BEST_IN_GAME),
    [character],
  );
  const optimize = useMemo(
    () => (target && locationAnswered && goals.length > 0 ? optimizeTarget(target, location) : null),
    [target, locationAnswered, goals.length, location],
  );
  const tieBreakers = useMemo(() => (target ? tieBreakersFor(target, goals) : []), [target, goals]);
  const { solution, failed } = useGearSuggestion(gear, profile, optimize, goals, tieBreakers);
  const update = (answers: GearSearch) => onSearchChange({ ...search, ...answers });

  return (
    <div className="space-y-3">
      {target && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => onSearchChange({})}>
            <RotateCcw />
            Start over
          </Button>
        </div>
      )}
      <ChatMessage>
        <p>What do you want to do?</p>
        {!target && (
          <TargetQuestion
            targets={targets}
            onChoose={(key) => update({ target: key, location: undefined, goals: undefined })}
          />
        )}
      </ChatMessage>
      {target && (
        <ChatAnswer
          label={target.name}
          onChange={() => update({ target: undefined, location: undefined, goals: undefined })}
        />
      )}

      {target && askLocation && (
        <>
          <ChatMessage>
            <p>Where?</p>
            {location === undefined && (
              <LocationQuestion
                gear={gear}
                profile={profile}
                target={target}
                onChoose={(location) => update({ location })}
              />
            )}
          </ChatMessage>
          {location !== undefined && (
            <ChatAnswer
              label={locationLabel(target, location, solution?.suggestion.location ?? null)}
              onChange={() => update({ location: undefined })}
            />
          )}
        </>
      )}

      {target && locationAnswered && (
        <>
          <ChatMessage>
            <p>What matters most? Pick up to {MAX_GOALS}, in order.</p>
            {goals.length === 0 && (
              <PriorityQuestion
                goals={allowedGoals}
                recommended={recommendedGoals(target)}
                onChoose={(picked) => update({ goals: picked.join(",") })}
              />
            )}
          </ChatMessage>
          {goals.length > 0 && (
            <ChatAnswer
              label={goals.map((id) => allowedGoals.find((g) => g.id === id)!.label).join(" › ")}
              onChange={() => update({ goals: undefined })}
            />
          )}
        </>
      )}

      {target && optimize && !character && <NoCharacterNote />}

      {target && optimize && (
        <GearResult
          gear={gear}
          profile={profile}
          target={target}
          optimize={optimize}
          solution={solution}
          failed={failed}
        />
      )}
    </div>
  );
}
