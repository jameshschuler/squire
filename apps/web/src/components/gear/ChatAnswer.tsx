import { Pencil } from "lucide-react";

interface ChatAnswerProps {
  label: string;
  onChange?: () => void;
}

const BUBBLE = "flex max-w-[90%] items-center gap-2 rounded-2xl border bg-background px-4 py-2.5 text-left";

export function ChatAnswer({ label, onChange }: ChatAnswerProps) {
  return (
    <div className="flex justify-end">
      {onChange ? (
        <button type="button" onClick={onChange} aria-label={`Change answer: ${label}`} className={BUBBLE}>
          <span>{label}</span>
          <Pencil className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <p className={BUBBLE}>{label}</p>
      )}
    </div>
  );
}
