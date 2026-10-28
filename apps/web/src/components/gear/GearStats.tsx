import type { StatRow } from "@/lib/gear-stats";

interface GearStatsProps {
  efficiency: string;
  rows: StatRow[];
}

export function GearStats({ efficiency, rows }: GearStatsProps) {
  const chips = [{ key: "workEfficiency", label: "Work efficiency", value: efficiency }, ...rows];
  return (
    <section aria-label="Set stats" className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span key={chip.key} className="rounded-md bg-background px-2 py-0.5 text-xs">
          <span className="text-muted-foreground">{chip.label}</span> {chip.value}
        </span>
      ))}
    </section>
  );
}
