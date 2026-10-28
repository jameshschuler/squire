import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { GearPick } from "@squire/api/gear-data";
import { Button } from "@/components/ui/button";
import { gearSetCode } from "@/lib/gear-set-code";

type CopyState = "ready" | "copied" | "copy-failed";
type Code = { picks: GearPick[]; code: string | null };

const RESET_MS = 2000;
const MESSAGES: Record<CopyState, string> = {
  ready: "In WalkScape, import a gear set and paste.",
  copied: "In WalkScape, import a gear set and paste.",
  "copy-failed": "Couldn't copy. Check that this page can use the clipboard.",
};

export function CopyGearSetButton({ picks }: { picks: GearPick[] }) {
  const [built, setBuilt] = useState<Code | null>(null);
  const [state, setState] = useState<CopyState>("ready");
  const code = built?.picks === picks ? built.code : undefined;

  useEffect(() => {
    let active = true;
    gearSetCode(picks).then(
      (next) => active && setBuilt({ picks, code: next }),
      () => active && setBuilt({ picks, code: null }),
    );
    return () => {
      active = false;
    };
  }, [picks]);

  useEffect(() => {
    if (state === "ready") {
      return;
    }
    const timer = setTimeout(() => setState("ready"), RESET_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = (text: string) =>
    navigator.clipboard.writeText(text).then(
      () => setState("copied"),
      () => setState("copy-failed"),
    );

  return (
    <div className="space-y-1">
      <Button onClick={() => code && copy(code)} disabled={!code} className="w-full">
        {state === "copied" ? <Check /> : <Copy />}
        {state === "copied" ? "Copied" : "Copy for WalkScape"}
      </Button>
      <p className="text-xs text-muted-foreground" role="status">
        {code === null ? "This browser can't build a gear-set code." : MESSAGES[state]}
      </p>
    </div>
  );
}
