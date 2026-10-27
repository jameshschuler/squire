import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCharacterContext } from "@/contexts/character-context";
import { Textarea } from "@/components/ui/textarea";

interface CharacterImportProps {
  title: string;
  onSaved: () => void;
  onCancel?: () => void;
}

export function CharacterImport({ title, onSaved, onCancel }: CharacterImportProps) {
  const { saveCharacter } = useCharacterContext();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();
  const errorId = useId();

  const save = () => {
    try {
      saveCharacter(text);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">
        In WalkScape, open Settings → Character → Export character data. That copies your character, so paste it here.
        It's saved on this device only.
      </p>
      <label htmlFor={fieldId} className="text-sm font-medium">
        Character data
      </label>
      <Textarea
        id={fieldId}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setError(null);
        }}
        rows={6}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="field-sizing-fixed font-mono md:text-xs"
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button onClick={save} disabled={!text.trim()}>
          Save character
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </section>
  );
}
