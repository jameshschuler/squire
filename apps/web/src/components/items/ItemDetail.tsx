import { useMemo } from "react";
import { recipesMaking, recipesUsing, type ItemSummary, type RecipeBook } from "@jameshschuler/walkscape-sdk";
import { BackButton } from "@/components/layout/BackButton";
import { RecipeList } from "@/components/recipes/RecipeList";
import { RecipeSection } from "@/components/recipes/RecipeSection";
import { GameIcon } from "@/components/shared/GameIcon";
import { ItemKeywords } from "./ItemKeywords";
import { ItemSources } from "./ItemSources";

interface ItemDetailProps {
  item: ItemSummary;
  book: RecipeBook;
}

export function ItemDetail({ item, book }: ItemDetailProps) {
  const making = useMemo(() => recipesMaking(book.recipes, item.id), [book, item.id]);
  const using = useMemo(() => recipesUsing(book.recipes, item.id), [book, item.id]);
  const sources = book.sources[item.id] ?? [];
  const isCrafted = making.length > 0;

  return (
    <article className="space-y-6 pt-2">
      <BackButton />
      <h1 className="flex items-center gap-3 text-2xl font-semibold">
        <GameIcon path={item.icon} size={48} />
        {item.name}
      </h1>
      {item.keywords.length > 0 && (
        <RecipeSection title="Keywords">
          <ItemKeywords keywords={item.keywords} />
        </RecipeSection>
      )}
      {isCrafted && (
        <RecipeSection title="Made by">
          <RecipeList recipes={making} />
        </RecipeSection>
      )}
      <RecipeSection title="Used in">
        {using.length > 0 ? (
          <RecipeList recipes={using} />
        ) : (
          <p className="text-muted-foreground">No recipe uses this.</p>
        )}
      </RecipeSection>
      {(!isCrafted || sources.length > 0) && (
        <RecipeSection title="Where to get it">
          <ItemSources sources={sources} />
        </RecipeSection>
      )}
    </article>
  );
}
