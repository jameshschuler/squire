import { BookOpenText, Code, Globe, MessageCircle } from "lucide-react";
import { BackButton } from "@/components/layout/BackButton";

const LINKS = [
  { label: "WalkScape", href: "https://walkscape.app", Icon: Globe },
  { label: "Wiki", href: "https://wiki.walkscape.app/wiki/WalkScape:_Grind_by_walking!", Icon: BookOpenText },
  { label: "Discord", href: "https://discord.gg/Kk6VecJFEk", Icon: MessageCircle },
  { label: "Source code", href: "https://github.com/jameshschuler/squire", Icon: Code },
];

export function AboutPage() {
  return (
    <section className="space-y-4 pt-2 text-sm">
      <BackButton />
      <h1 className="text-lg font-semibold">About Squire</h1>
      <p>
        Squire is a companion app for WalkScape. Look up recipes, materials, food and loot, even offline, and load your
        character to plan your gear.
      </p>
      <p className="text-muted-foreground">
        Game data and icons © WalkScape. Squire is an unofficial fan tool, not made or endorsed by the WalkScape team.
        Its data comes from the official WalkScape Data API.
      </p>
      <ul className="space-y-2">
        {LINKS.map(({ label, href, Icon }) => (
          <li key={label}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 underline-offset-4 hover:underline"
            >
              <Icon className="size-4 text-muted-foreground" />
              {label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
