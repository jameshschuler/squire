import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { BreakdownStep } from "@/lib/steps-breakdown";

export function StepsBreakdown({ steps }: { steps: BreakdownStep[] }) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="group h-7 px-0 text-xs text-muted-foreground hover:bg-transparent">
          How the steps are worked out
          <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol aria-label="Steps breakdown" className="space-y-1.5 rounded-lg border bg-background px-3 py-2 text-xs">
          {steps.map((step) => (
            <li key={step.label} className="min-w-0">
              <div className="flex justify-between gap-3">
                <span className="font-medium">
                  {step.label}
                  {step.detail && <span className="font-normal text-muted-foreground"> {step.detail}</span>}
                </span>
                <span className="shrink-0 tabular-nums">{step.result}</span>
              </div>
              {step.sources.length > 0 && (
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{step.sources.join(" · ")}</p>
              )}
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
