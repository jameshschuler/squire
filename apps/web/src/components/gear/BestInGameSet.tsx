import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { GearSetView } from "@/lib/gear-answer";
import { formatNumber } from "@/lib/format";
import { GearSetDetails } from "./GearSetDetails";

export function BestInGameSet(set: GearSetView) {
  return (
    <Collapsible className="border-t border-foreground/10 pt-2">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="group w-full justify-between px-0 hover:bg-transparent">
          <span>Best in game · {formatNumber(set.suggestion.result.steps)} steps</span>
          <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-1">
        <p className="text-xs text-muted-foreground">The fastest set with every item in the game, at max level.</p>
        <GearSetDetails {...set} statsLabel="Best in game stats" />
      </CollapsibleContent>
    </Collapsible>
  );
}
