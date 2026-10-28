import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import type { RecipeBook } from "@squire/api/recipe-book";
import { BEST_IN_GAME, type GearData, type PlayerProfile } from "@squire/api/gear-data";
import { Button } from "@/components/ui/button";
import { useCharacterContext } from "@/contexts/character-context";
import { BEST_LOCATION, gearTargets, optimizeTarget } from "@/lib/gear-targets";
import type { GearSearch, GearSource } from "@/lib/gear-search";
import { ChatAnswer } from "./ChatAnswer";
import { ChatMessage } from "./ChatMessage";
import { ChoiceButtons } from "./ChoiceButtons";
import { GearResult } from "./GearResult";
import { TargetQuestion } from "./TargetQuestion";

interface GearChatProps {
  book: RecipeBook;
  gear: GearData;
  search: GearSearch;
  onSearchChange: (search: GearSearch) => void;
}

const SOURCES: { value: GearSource; label: string }[] = [
  { value: "mine", label: "My gear" },
  { value: "best", label: "Best in game" },
];

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
  const source = character ? search.gear : "best";
  const profile = useMemo<PlayerProfile>(
    () => (source === "mine" && character ? { kind: "character", character } : BEST_IN_GAME),
    [source, character],
  );
  const optimize = useMemo(
    () => (target && locationAnswered && source ? optimizeTarget(target, location) : null),
    [target, locationAnswered, source, location],
  );
  const update = (answers: GearSearch) => onSearchChange({ ...search, ...answers });
  const locationLabel = target?.locations.find((l) => l.id === location)?.name ?? "Best location";

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
        <p>What do you want to do? I'll find the gear that needs the fewest steps.</p>
        {!target && (
          <TargetQuestion targets={targets} onChoose={(key) => update({ target: key, location: undefined })} />
        )}
      </ChatMessage>
      {target && <ChatAnswer label={target.name} onChange={() => update({ target: undefined, location: undefined })} />}

      {target && askLocation && (
        <>
          <ChatMessage>
            <p>Where?</p>
            {location === undefined && (
              <ChoiceButtons
                choices={[
                  { value: BEST_LOCATION, label: "Best location" },
                  ...target.locations.map((l) => ({ value: l.id, label: l.name })),
                ]}
                onChoose={(location) => update({ location })}
              />
            )}
          </ChatMessage>
          {location !== undefined && (
            <ChatAnswer label={locationLabel} onChange={() => update({ location: undefined })} />
          )}
        </>
      )}

      {target && locationAnswered && character && (
        <>
          <ChatMessage>
            <p>Whose gear?</p>
            {!search.gear && (
              <ChoiceButtons choices={SOURCES} onChoose={(gear) => update({ gear: gear as GearSource })} />
            )}
          </ChatMessage>
          {search.gear && (
            <ChatAnswer
              label={SOURCES.find((s) => s.value === search.gear)!.label}
              onChange={() => update({ gear: undefined })}
            />
          )}
        </>
      )}

      {target && locationAnswered && !character && (
        <ChatMessage>
          <p className="text-sm">
            No character added, so I'll use the best gear in the game.{" "}
            <Link to="/character" className="font-medium underline underline-offset-4">
              Add your character
            </Link>{" "}
            to use your own.
          </p>
        </ChatMessage>
      )}

      {target && optimize && (
        <GearResult
          gear={gear}
          profile={profile}
          target={target}
          optimize={optimize}
          showLocation={askLocation && location === BEST_LOCATION}
        />
      )}
    </div>
  );
}
