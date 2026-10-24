import { useMemo } from "react";
import {
  findRecipesByOutput,
  findRecipesByMaterial,
  type ItemWithEffects,
  type RecipeBook,
} from "@squire/api/recipe-book";
import { BackButton } from "@/components/layout/BackButton";
import { RecipeList } from "@/components/recipes/RecipeList";
import { Section } from "@/components/shared/Section";
import { CollectibleBadge } from "@/components/shared/CollectibleBadge";
import { GameIcon } from "@/components/shared/GameIcon";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { ItemEffectsSection } from "./ItemEffectsSection";
import { ItemKeywords } from "./ItemKeywords";
import { ItemSources } from "./ItemSources";

interface ItemDetailProps {
  item: ItemWithEffects;
  book: RecipeBook;
}

export function ItemDetail({ item, book }: ItemDetailProps) {
  const madeBy = useMemo(() => findRecipesByOutput(book.recipes, item.id), [book, item.id]);
  const usedIn = useMemo(() => findRecipesByMaterial(book.recipes, item.id), [book, item.id]);
  const sources = book.sources[item.id] ?? [];
  const isCrafted = madeBy.length > 0;

  return (
    <article className="space-y-6 pt-2">
      <BackButton />
      <div className="flex items-center gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-semibold">
          <GameIcon path={item.icon} size={48} />
          {item.name}
        </h1>
        {item.isCollectible ? (
          <CollectibleBadge />
        ) : (
          item.quality && !item.effects?.tiers.length && <QualityBadge quality={item.quality} />
        )}
      </div>
      {item.keywords.length > 0 && (
        <Section title="Keywords">
          <ItemKeywords keywords={item.keywords} />
        </Section>
      )}
      {item.effects && <ItemEffectsSection key={item.id} effects={item.effects} />}
      {isCrafted && (
        <Section title="Made by">
          <RecipeList recipes={madeBy} />
        </Section>
      )}
      <Section title="Used in">
        {usedIn.length > 0 ? (
          <RecipeList recipes={usedIn} />
        ) : (
          <p className="text-muted-foreground">No recipe uses this.</p>
        )}
      </Section>
      {(!isCrafted || sources.length > 0) && (
        <Section title="Where to get it">
          <ItemSources sources={sources} />
        </Section>
      )}
    </article>
  );
}
