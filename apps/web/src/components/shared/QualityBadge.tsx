import type { ItemQuality } from "@squire/api/recipe-book";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { QUALITY_STYLES } from "./quality-styles";

export function QualityBadge({ quality }: { quality: ItemQuality }) {
  return (
    <Badge variant="outline" className={cn("capitalize", QUALITY_STYLES[quality])}>
      {quality}
    </Badge>
  );
}
