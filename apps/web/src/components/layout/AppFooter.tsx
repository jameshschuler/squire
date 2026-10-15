import { Globe, MessageCircle } from "lucide-react";

const LINKS = [
  { label: "WalkScape", href: "https://walkscape.app", Icon: Globe },
  { label: "Discord", href: "https://discord.gg/Kk6VecJFEk", Icon: MessageCircle },
];

export function AppFooter() {
  return (
    <footer className="space-y-2 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center text-xs text-muted-foreground">
      <p>Game data and icons © WalkScape. Squire is an unofficial fan tool.</p>
      <nav className="flex justify-center gap-4">
        {LINKS.map(({ label, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
          >
            <Icon className="size-3.5" />
            {label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
