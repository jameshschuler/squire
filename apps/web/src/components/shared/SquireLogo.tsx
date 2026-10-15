import { cn } from "@/lib/utils";

const SHIELD_WITH_BOOK =
  "M256 84 L396 132 V252 C396 340 336 404 256 436 C176 404 116 340 116 252 V132 Z" +
  "M162 206 C196 192 228 194 248 210 V338 C228 322 196 320 162 334 Z" +
  "M350 206 C316 192 284 194 264 210 V338 C284 322 316 320 350 334 Z";

export function SquireLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="116 84 280 352" aria-hidden className={cn("text-amber-500 dark:text-amber-400", className)}>
      <path d={SHIELD_WITH_BOOK} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
