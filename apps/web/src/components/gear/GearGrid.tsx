import { ownedKey, type GearPick, type OwnedPetView } from "@squire/api/gear-data";
import { gearCells, toolCells, type GearCell } from "@/lib/gear-grid";
import { GearSlotCell } from "./GearSlotCell";

interface GearGridProps {
  picks: GearPick[];
  kept: GearPick[];
  pet: OwnedPetView | null;
  toolSlots: number;
  equipped: Set<string> | null;
}

export function GearGrid({ picks, kept, pet, toolSlots, equipped }: GearGridProps) {
  const isEquipped = (pick: GearPick) => equipped?.has(ownedKey({ id: pick.item.id, quality: pick.quality })) ?? false;
  const render = (cell: GearCell) => (
    <GearSlotCell
      key={cell.label}
      label={cell.label}
      name={cell.pick?.item.name ?? null}
      icon={cell.pick?.item.icon ?? ""}
      itemId={cell.pick?.item.id ?? null}
      faded={cell.kept}
      equipped={!cell.kept && cell.pick !== null && isEquipped(cell.pick)}
    />
  );
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">{gearCells(picks, kept).map(render)}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {toolCells(picks, kept, toolSlots).map(render)}
        {pet && <GearSlotCell label={`Pet · lvl ${pet.level}`} name={pet.pet.name} icon={pet.pet.icon} itemId={null} />}
      </div>
      {kept.length > 0 && (
        <p className="text-xs text-muted-foreground">Faded items are what you wear now. They don't change the steps.</p>
      )}
    </div>
  );
}
