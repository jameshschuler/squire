import { Link } from "@tanstack/react-router";
import { GameIcon } from "@/components/shared/GameIcon";
import { Section } from "@/components/shared/Section";
import { collectionProgress } from "@/lib/collectibles";
import type { PetEntry } from "@/lib/pets";
import { cn } from "@/lib/utils";

export function CharacterPets({ pets }: { pets: PetEntry[] }) {
  const found = pets.filter((entry) => entry.level !== null).length;

  return (
    <Section title={`Pets · ${collectionProgress(found, pets.length)}`}>
      <ul aria-label="Pets" className="grid grid-cols-6 gap-2 sm:grid-cols-8">
        {pets.map(({ pet, level }) => (
          <li key={pet.id}>
            <Link
              to="/pets/$petId"
              params={{ petId: pet.id }}
              title={pet.name}
              className="relative flex aspect-square items-center justify-center rounded-md border bg-muted/30"
            >
              <GameIcon
                path={pet.icon}
                size={36}
                className={cn(level === null && "opacity-25 brightness-0 dark:invert")}
              />
              <span className="sr-only">
                {level === null ? `${pet.name}, not found yet` : `${pet.name}, level ${level}`}
              </span>
              {level !== null && (
                <span
                  aria-hidden
                  className="absolute right-1 bottom-0.5 text-[10px] text-muted-foreground tabular-nums"
                >
                  {level}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
