import { Button } from "@/components/ui/button";

interface ChoiceButtonsProps {
  choices: { value: string; label: string }[];
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
          className="rounded-full bg-background"
          onClick={() => onChoose(choice.value)}
        >
          {choice.label}
        </Button>
      ))}
    </div>
  );
}
