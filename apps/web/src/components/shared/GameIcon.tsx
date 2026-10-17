import { useState } from "react";
import { iconUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface GameIconProps {
  path: string;
  size?: number;
  className?: string;
}

type LoadState = { path: string; status: "loaded" | "failed" };

export function GameIcon({ path, size = 32, className }: GameIconProps) {
  const [load, setLoad] = useState<LoadState>();
  const status = load?.path === path ? load.status : "loading";

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
      key={path}
      ref={(img) => {
        if (status === "loading" && img?.complete && img.naturalWidth > 0) {
          setLoad({ path, status: "loaded" });
        }
      }}
      src={iconUrl(path)}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      crossOrigin="anonymous"
      onLoad={() => setLoad({ path, status: "loaded" })}
      onError={() => setLoad({ path, status: "failed" })}
      data-state={status}
      className={cn(
        "shrink-0 [image-rendering:pixelated]",
        status !== "loaded" && "rounded-md bg-muted",
        status === "loading" && "animate-pulse",
        className,
      )}
    />
  );
}
