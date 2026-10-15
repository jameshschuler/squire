import { Badge } from "@/components/ui/badge";

export function ItemKeywords({ keywords }: { keywords: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5 pt-1">
      {keywords.map((keyword) => (
        <li key={keyword}>
          <Badge variant="secondary" className="font-normal">
            {keyword}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
