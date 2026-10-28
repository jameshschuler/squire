import type { ReactNode } from "react";

export function ChatMessage({ children }: { children: ReactNode }) {
  return <div className="max-w-[90%] space-y-3 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">{children}</div>;
}
