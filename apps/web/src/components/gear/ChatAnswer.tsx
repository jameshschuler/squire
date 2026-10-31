import { Pencil } from "lucide-react";

interface ChatAnswerProps {
  label: string;
  hint?: string | null;
  onChange?: () => void;
}

const BUBBLE = "flex max-w-[90%] items-center gap-2 rounded-2xl border bg-background px-4 py-2.5 text-left";

export function ChatAnswer({ label, hint, onChange }: ChatAnswerProps) {
  const text = (
    <span>
      {label}
      {hint && <span className="ml-1.5 text-xs text-muted-foreground">{hint}</span>}
    </span>
  );
  return (
    <div className="flex justify-end">
      {onChange ? (
        <button type="button" onClick={onChange} aria-label={`Change answer: ${label}`} className={BUBBLE}>
          {text}
          <Pencil className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <p className={BUBBLE}>{text}</p>
      )}
    </div>
  );
}
