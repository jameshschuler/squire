import { Link } from "@tanstack/react-router";
import { GameIcon } from "@/components/shared/GameIcon";
import { formatSkillLevel } from "@/lib/format";
import type { Material } from "@/lib/materials";

export function MaterialListItem({ material }: { material: Material }) {
  const { item, skills } = material;
  return (
    <li>
      <Link to="/items/$itemId" params={{ itemId: item.id }} className="flex items-center gap-3 py-2.5">
        <GameIcon path={item.icon} />
        <span className="min-w-0">
          <span className="block font-medium">{item.name}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {skills.length > 0 ? skills.map(formatSkillLevel).join(" · ") : "No known source yet"}
          </span>
        </span>
      </Link>
    </li>
  );
}
