import type { ActivityView } from "@squire/api/recipe-book";
import { BackButton } from "@/components/layout/BackButton";
import { GameIcon } from "@/components/shared/GameIcon";
import { LocationRow } from "@/components/shared/LocationRow";
import { Section } from "@/components/shared/Section";
import { WorkBadges } from "@/components/shared/WorkBadges";
import { Badge } from "@/components/ui/badge";
import { formatSkillLevel } from "@/lib/format";
import { sortByRegion } from "@/lib/locations";
import { ActivityDrops } from "./ActivityDrops";
import { ActivityNeedRow } from "./ActivityNeedRow";

export function ActivityDetail({ activity }: { activity: ActivityView }) {
  return (
    <article className="space-y-6 pt-2">
      <BackButton />
      <header className="space-y-3">
        <h1 className="flex items-center gap-3 text-2xl font-semibold">
          <GameIcon path={activity.icon} size={48} />
          {activity.name}
        </h1>
        <div className="flex flex-wrap gap-2">
          {activity.skills.map((skill) => (
            <Badge key={skill.id} variant="secondary">
              {formatSkillLevel(skill)}
            </Badge>
          ))}
          <WorkBadges workRequired={activity.workRequired} maxWorkEfficiency={activity.maxWorkEfficiency} />
        </div>
      </header>

      {activity.needs.length > 0 && (
        <Section title="Needs">
          {activity.needs.map((need, i) => (
            <ActivityNeedRow key={i} need={need} />
          ))}
        </Section>
      )}

      {activity.uses.length > 0 && (
        <Section title="Uses">
          {activity.uses.map((use, i) => (
            <ActivityNeedRow key={i} need={use} />
          ))}
        </Section>
      )}

      <Section title="Where">
        {activity.locations.length > 0 ? (
          <ul className="divide-y">
            {sortByRegion(activity.locations).map((location) => (
              <LocationRow key={location.id} location={location} />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No known location</p>
        )}
      </Section>

      {activity.drops.map((drops) => (
        <ActivityDrops key={drops.lootType} drops={drops} />
      ))}
    </article>
  );
}
