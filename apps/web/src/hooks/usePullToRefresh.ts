import { useEffect, useRef, useState } from "react";
import { PULL_THRESHOLD, pullDistance } from "@/lib/pull-to-refresh";

export type RefreshStatus = "idle" | "refreshing" | "failed";

const FAILED_MESSAGE_MS = 2000;
const NOT_A_PULL = '[role="dialog"], [role="alertdialog"]';

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pull, setPull] = useState(0);
  const [status, setStatus] = useState<RefreshStatus>("idle");
  const busy = useRef(false);

  useEffect(() => {
    let start: { x: number; y: number } | null = null;
    let distance = 0;
    let failedTimer: ReturnType<typeof setTimeout> | undefined;

    const stop = () => {
      start = null;
      setPull(0);
    };
    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      const inDialog = event.target instanceof Element && event.target.closest(NOT_A_PULL);
      start =
        touch && window.scrollY === 0 && !busy.current && !inDialog ? { x: touch.clientX, y: touch.clientY } : null;
      distance = 0;
    };
    const onMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!start || !touch) {
        return;
      }
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        distance = 0;
        stop();
        return;
      }
      distance = pullDistance(dy);
      setPull(distance);
    };
    const onEnd = () => {
      if (!start) {
        return;
      }
      stop();
      if (distance < PULL_THRESHOLD) {
        return;
      }
      clearTimeout(failedTimer);
      busy.current = true;
      setStatus("refreshing");
      onRefresh()
        .then(() => setStatus("idle"))
        .catch(() => {
          setStatus("failed");
          failedTimer = setTimeout(() => setStatus("idle"), FAILED_MESSAGE_MS);
        })
        .finally(() => {
          busy.current = false;
        });
    };

    addEventListener("touchstart", onStart, { passive: true });
    addEventListener("touchmove", onMove, { passive: true });
    addEventListener("touchend", onEnd);
    addEventListener("touchcancel", stop);
    return () => {
      removeEventListener("touchstart", onStart);
      removeEventListener("touchmove", onMove);
      removeEventListener("touchend", onEnd);
      removeEventListener("touchcancel", stop);
      clearTimeout(failedTimer);
    };
  }, [onRefresh]);

  return { pull, status, isReady: pull >= PULL_THRESHOLD };
}
