import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ChatMessage({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("space-y-3 rounded-2xl rounded-tl-sm bg-muted px-4 py-3", !wide && "max-w-[90%]")}>
      {children}
    </div>
  );
}
