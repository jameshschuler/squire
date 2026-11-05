import { Section } from "@/components/shared/Section";
import { formatStepCount } from "@/lib/format";
import type { ItemWear as Wear } from "@/lib/wear";

export function ItemWear({ wear }: { wear: Wear }) {
  return (
    <Section title="W.E.A.R.">
      <p>
        <span className="font-medium tabular-nums">{formatStepCount(wear.steps)}</span>{" "}
        <span className="text-muted-foreground">
          to get one at max work efficiency{wear.from && `, from ${wear.from}`}
        </span>
      </p>
    </Section>
  );
}
