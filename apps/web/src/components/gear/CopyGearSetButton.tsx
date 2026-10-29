import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { GearPick } from "@squire/api/gear-data";
import { Button } from "@/components/ui/button";
import { gearSetCode } from "@/lib/gear-set-code";

type CopyState = "ready" | "copied" | "copy-failed";
type Code = { picks: GearPick[]; code: string | null };

const RESET_MS = 2000;

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

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("copy-failed");
    }
  };

  return (
    <div className="space-y-1">
      <Button
        size="sm"
        variant="outline"
        onClick={() => code && copy(code)}
        disabled={!code}
        className="w-full bg-background"
      >
        {state === "copied" ? <Check /> : <Copy />}
        {state === "copied" ? "Copied" : "Copy"}
        <span className="sr-only"> gear set for WalkScape</span>
      </Button>
      <p className="text-xs text-destructive empty:hidden" role="status">
        {state === "copied" && <span className="sr-only">Copied</span>}
        {code === null && "This browser can't build a gear-set code."}
        {state === "copy-failed" && "Couldn't copy. Check that this page can use the clipboard."}
      </p>
    </div>
  );
}
