import { useEffect, useRef, useState } from "react";

const visibleCounts = new Map<string, number>();

export function useIncrementalList<T>(items: T[], listKey: string, pageSize: number) {
  const [visibleCount, setVisibleCount] = useState(() => visibleCounts.get(listKey) ?? pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = visibleCount < items.length;

  useEffect(() => {
    if (visibleCount > pageSize) {
      visibleCounts.set(listKey, visibleCount);
    }
  }, [listKey, pageSize, visibleCount]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisibleCount((count) => count + pageSize);
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, pageSize, visibleCount]);

  return { visibleItems: items.slice(0, visibleCount), hasMore, sentinelRef };
}
