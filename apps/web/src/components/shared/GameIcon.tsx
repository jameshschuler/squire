import { iconUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface GameIconProps {
  path: string;
  size?: number;
  className?: string;
}

export function GameIcon({ path, size = 32, className }: GameIconProps) {
  if (!path) {
    return (
      <span
        className={cn("inline-block shrink-0 rounded-md bg-muted", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <img
      src={iconUrl(path)}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      crossOrigin="anonymous"
      className={cn("shrink-0 [image-rendering:pixelated]", className)}
    />
  );
}
