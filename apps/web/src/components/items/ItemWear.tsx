import { Link } from "@tanstack/react-router";
import { GameIcon } from "@/components/shared/GameIcon";
import { Section } from "@/components/shared/Section";
import { formatStepCount } from "@/lib/format";
import type { WearSource } from "@/lib/wear";

export function ItemWear({ sources }: { sources: WearSource[] }) {
  return (
    <Section title="W.E.A.R.">
      <p className="text-sm text-muted-foreground">Average steps to get one at max work efficiency.</p>
      <ul className="divide-y">
        {sources.map((source) => (
          <li key={source.id}>
            <Link
              to="/activities/$activityId"
              params={{ activityId: source.id }}
              className="flex items-center gap-3 py-2"
            >
              <GameIcon path={source.icon} />
              <span className="min-w-0 flex-1 truncate font-medium">{source.name}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{formatStepCount(source.wear)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
