import type { RecipeView } from "@squire/api/recipe-book";
import { useIncrementalList } from "@/hooks/useIncrementalList";
import { RecipeList } from "./RecipeList";

const PAGE_SIZE = 50;

interface RecipeResultsProps {
  recipes: RecipeView[];
  listKey: string;
}

export function RecipeResults({ recipes, listKey }: RecipeResultsProps) {
  const { visibleItems, hasMore, sentinelRef } = useIncrementalList(recipes, listKey, PAGE_SIZE);
  return (
    <>
      <RecipeList recipes={visibleItems} />
      {hasMore && <div ref={sentinelRef} aria-hidden className="h-px" />}
    </>
  );
}
