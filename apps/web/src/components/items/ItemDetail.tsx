import { useMemo } from "react";
import { recipesMaking, recipesUsing, type Item, type RecipeView } from "@squire/walkscape-sdk";
import { BackButton } from "@/components/layout/BackButton";
import { RecipeList } from "@/components/recipes/RecipeList";
import { RecipeSection } from "@/components/recipes/RecipeSection";
import { GameIcon } from "@/components/shared/GameIcon";

interface ItemDetailProps {
  item: Item;
  recipes: RecipeView[];
}

export function ItemDetail({ item, recipes }: ItemDetailProps) {
  const making = useMemo(() => recipesMaking(recipes, item.id), [recipes, item.id]);
  const using = useMemo(() => recipesUsing(recipes, item.id), [recipes, item.id]);

  return (
    <article className="space-y-6 pt-2">
      <BackButton />
      <h1 className="flex items-center gap-3 text-2xl font-semibold">
        <GameIcon path={item.icon} size={48} />
        {item.name}
      </h1>
      <RecipeSection title="Made by">
        {making.length > 0 ? (
          <RecipeList recipes={making} />
        ) : (
          <p className="text-muted-foreground">No recipe makes this. It's gathered or found.</p>
        )}
      </RecipeSection>
      <RecipeSection title="Used in">
        {using.length > 0 ? (
          <RecipeList recipes={using} />
        ) : (
          <p className="text-muted-foreground">No recipe uses this.</p>
        )}
      </RecipeSection>
    </article>
  );
}
