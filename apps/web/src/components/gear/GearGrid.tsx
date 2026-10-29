import type { GearPick, OwnedPetView } from "@squire/api/gear-data";
import { gearCells, pickQuality, toolCells, type GearCell } from "@/lib/gear-grid";
import { GearSlotCell } from "./GearSlotCell";

interface GearGridProps {
  picks: GearPick[];
  pet: OwnedPetView | null;
  toolSlots: number;
}

export function GearGrid({ picks, pet, toolSlots }: GearGridProps) {
  const render = (cell: GearCell) => (
    <GearSlotCell
      key={cell.label}
      label={cell.label}
      name={cell.pick?.item.name ?? null}
      icon={cell.pick?.item.icon ?? ""}
      itemId={cell.pick?.item.id ?? null}
      quality={cell.pick && pickQuality(cell.pick)}
    />
  );
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">{gearCells(picks).map(render)}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {toolCells(picks, toolSlots).map(render)}
        {pet && <GearSlotCell label={`Pet · lvl ${pet.level}`} name={pet.pet.name} icon={pet.pet.icon} itemId={null} />}
      </div>
    </div>
  );
}
