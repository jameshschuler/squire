import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChoiceButtonsProps {
  choices: { value: string; label: string; detail?: string }[];
  onChoose: (value: string) => void;
}

export function ChoiceButtons({ choices, onChoose }: ChoiceButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {choices.map((choice) => (
        <Button
          key={choice.value}
          size="sm"
          variant="outline"
          className={cn(
            "rounded-full bg-background",
            choice.detail &&
              "h-auto max-w-full flex-col items-start gap-0 rounded-2xl py-1.5 text-left whitespace-normal",
          )}
          onClick={() => onChoose(choice.value)}
        >
          {choice.label}
          {choice.detail && (
            <span className="text-xs font-normal text-muted-foreground">
              <span className="sr-only">, </span>
              {choice.detail}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}
