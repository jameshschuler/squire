import { cn } from "@/lib/utils";

const MONOGRAM =
  "M344 172 C344 132 304 112 256 112 C200 112 166 140 166 182 C166 226 206 242 256 256 " +
  "C308 270 346 288 346 334 C346 376 308 400 256 400 C202 400 166 378 166 340";

export function SquireLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="130 76 252 360" aria-hidden className={cn("text-amber-500 dark:text-amber-400", className)}>
      <path d={MONOGRAM} fill="none" stroke="currentColor" strokeWidth="64" strokeLinecap="round" />
    </svg>
  );
}
