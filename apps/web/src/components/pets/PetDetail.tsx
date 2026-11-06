import { Link } from "@tanstack/react-router";
import type { PetPage } from "@squire/api/recipe-book";
import { BackButton } from "@/components/layout/BackButton";
import { EffectTable } from "@/components/shared/EffectTable";
import { GameIcon } from "@/components/shared/GameIcon";
import { Section } from "@/components/shared/Section";
import { formatTitle } from "@/lib/format";

export function PetDetail({ pet }: { pet: PetPage }) {
  return (
    <article className="space-y-6 pt-2">
      <BackButton />
      <header className="space-y-2">
        <h1 className="flex min-w-0 items-center gap-3 text-2xl font-semibold">
          <GameIcon path={pet.icon} size={48} />
          {pet.name}
        </h1>
        <p className="text-muted-foreground">{pet.description}</p>
      </header>
      {pet.egg && (
        <Section title="Hatches from">
          <Link to="/items/$itemId" params={{ itemId: pet.egg.id }} className="flex items-center gap-3 py-2">
            <GameIcon path={pet.egg.icon} />
            <span className="font-medium">{pet.egg.name}</span>
          </Link>
        </Section>
      )}
      {pet.levels.map(({ level, stage, effects }) => (
        <Section key={level} title={`Level ${level} · ${formatTitle(stage)}`}>
          {effects.length > 0 ? (
            <EffectTable effects={effects} />
          ) : (
            <p className="text-muted-foreground">No effects at this level.</p>
          )}
        </Section>
      ))}
    </article>
  );
}
