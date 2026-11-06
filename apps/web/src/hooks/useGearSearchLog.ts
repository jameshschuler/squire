import { useEffect } from "react";
import { sendGearSearchLog } from "@/lib/api";
import { gearSearchAsked, gearSearchLog, type GearSearchDetails } from "@/lib/gear-search-log";
import type { GearSuggestionState } from "./useGearSuggestion";

let lastLogged: string | null = null;

export function useGearSearchLog(details: GearSearchDetails, { solution, failed }: GearSuggestionState): void {
  const { target } = details;
  const asked = target ? gearSearchAsked({ ...details, target }) : null;
  const askedKey = asked && JSON.stringify(asked);
  const line = asked && (solution || failed) ? JSON.stringify(gearSearchLog(asked, solution)) : null;

  useEffect(() => {
    if (!askedKey || !line || askedKey === lastLogged) {
      return;
    }

    lastLogged = askedKey;
    sendGearSearchLog(line);
  }, [askedKey, line]);
}
