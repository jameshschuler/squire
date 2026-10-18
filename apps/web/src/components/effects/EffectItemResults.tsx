import type { ItemWithEffects } from "@squire/api/recipe-book";
import { useIncrementalList } from "@/hooks/useIncrementalList";
import { EffectItemListItem } from "./EffectItemListItem";

const PAGE_SIZE = 50;

interface EffectItemResultsProps {
  items: ItemWithEffects[];
  filter: string | undefined;
  listKey: string;
}

export function EffectItemResults({ items, filter, listKey }: EffectItemResultsProps) {
  const { visibleItems, hasMore, sentinelRef } = useIncrementalList(items, listKey, PAGE_SIZE);
  return (
    <>
      <ul className="divide-y">
        {visibleItems.map((item) => (
          <EffectItemListItem key={item.id} item={item} filter={filter} />
        ))}
      </ul>
      {hasMore && <div ref={sentinelRef} aria-hidden className="h-px" />}
    </>
  );
}
