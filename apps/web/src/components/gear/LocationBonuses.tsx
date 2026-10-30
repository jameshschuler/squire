import type { AnswerLocation } from "@/lib/gear-answer";

export function LocationBonuses({ name, bonuses }: AnswerLocation) {
  return (
    <section aria-label="Location" className="space-y-1 text-sm">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">At {name}</h3>
      {bonuses.length > 0 ? (
        <ul className="space-y-0.5">
          {bonuses.map((bonus, i) => (
            <li key={i}>{bonus}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No gear bonuses here that depend on the location.</p>
      )}
    </section>
  );
}
