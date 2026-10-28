import { GEAR_SLOTS, type GearPick } from "@squire/api/gear-data";

interface GearSetEntry {
  type: string;
  index?: number;
  item: string;
}

export function gearSetEntries(picks: GearPick[]): GearSetEntry[] {
  const entry = (pick: GearPick | undefined) =>
    pick?.item.gameId
      ? JSON.stringify({ id: pick.item.gameId, quality: pick.quality ?? pick.item.quality, tag: null })
      : "null";
  return GEAR_SLOTS.flatMap(({ slot, capacity }) => {
    const inSlot = picks.filter((p) => p.slot === slot);
    return capacity === 1
      ? [{ type: slot, item: entry(inSlot[0]) }]
      : Array.from({ length: capacity }, (_, index) => ({ type: slot, index, item: entry(inSlot[index]) }));
  });
}

export async function gearSetCode(picks: GearPick[]): Promise<string> {
  const json = new Blob([JSON.stringify({ items: gearSetEntries(picks) })]);
  const gzipped = await new Response(json.stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(gzipped)));
}
