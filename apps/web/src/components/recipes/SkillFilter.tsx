import { Button } from "@/components/ui/button";
import type { SkillOption } from "@/lib/skills";

interface SkillFilterProps {
  skills: SkillOption[];
  selected: string | undefined;
  onSelect: (skill: string | undefined) => void;
}

export function SkillFilter({ skills, selected, onSelect }: SkillFilterProps) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      <Button
        size="sm"
        variant={selected ? "outline" : "secondary"}
        className="rounded-full"
        onClick={() => onSelect(undefined)}
      >
        All
      </Button>
      {skills.map((skill) => (
        <Button
          key={skill.id}
          size="sm"
          variant={selected === skill.id ? "secondary" : "outline"}
          className="rounded-full"
          onClick={() => onSelect(selected === skill.id ? undefined : skill.id)}
        >
          {skill.name}
        </Button>
      ))}
    </div>
  );
}
