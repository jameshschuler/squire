import type { ItemQuality } from "@squire/api/recipe-book";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const QUALITY_STYLES: Record<ItemQuality, string> = {
  common: "border-zinc-400 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  uncommon: "border-lime-500 bg-green-100 text-green-800 dark:bg-green-950 dark:text-lime-300",
  rare: "border-teal-400 bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-teal-300",
  epic: "border-fuchsia-400 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-fuchsia-300",
  legendary: "border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  ethereal: "border-red-400 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function QualityBadge({ quality }: { quality: ItemQuality }) {
  return (
    <Badge variant="outline" className={cn("capitalize", QUALITY_STYLES[quality])}>
      {quality}
    </Badge>
  );
}
