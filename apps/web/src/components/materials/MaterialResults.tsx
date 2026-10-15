import { useIncrementalList } from "@/hooks/useIncrementalList";
import type { Material } from "@/lib/materials";
import { MaterialListItem } from "./MaterialListItem";

const PAGE_SIZE = 50;

interface MaterialResultsProps {
  materials: Material[];
  listKey: string;
}

export function MaterialResults({ materials, listKey }: MaterialResultsProps) {
  const { visibleItems, hasMore, sentinelRef } = useIncrementalList(materials, listKey, PAGE_SIZE);
  return (
    <>
      <ul className="divide-y">
        {visibleItems.map((material) => (
          <MaterialListItem key={material.item.id} material={material} />
        ))}
      </ul>
      {hasMore && <div ref={sentinelRef} aria-hidden className="h-px" />}
    </>
  );
}
