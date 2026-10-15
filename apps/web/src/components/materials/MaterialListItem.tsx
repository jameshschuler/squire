import { Link } from "@tanstack/react-router";
import { GameIcon } from "@/components/shared/GameIcon";
import type { Material } from "@/lib/materials";

export function MaterialListItem({ material }: { material: Material }) {
  const { item } = material;
  return (
    <li>
      <Link to="/items/$itemId" params={{ itemId: item.id }} className="flex items-center gap-3 py-2.5">
        <GameIcon path={item.icon} />
        <span className="font-medium">{item.name}</span>
      </Link>
    </li>
  );
}
