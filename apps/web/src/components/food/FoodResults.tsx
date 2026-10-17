import { useIncrementalList } from "@/hooks/useIncrementalList";
import type { Food } from "@/lib/foods";
import { FoodListItem } from "./FoodListItem";

const PAGE_SIZE = 50;

interface FoodResultsProps {
  foods: Food[];
  filter: string | undefined;
  listKey: string;
}

export function FoodResults({ foods, filter, listKey }: FoodResultsProps) {
  const { visibleItems, hasMore, sentinelRef } = useIncrementalList(foods, listKey, PAGE_SIZE);
  return (
    <>
      <ul className="divide-y">
        {visibleItems.map((food) => (
          <FoodListItem key={food.id} food={food} filter={filter} />
        ))}
      </ul>
      {hasMore && <div ref={sentinelRef} aria-hidden className="h-px" />}
    </>
  );
}
