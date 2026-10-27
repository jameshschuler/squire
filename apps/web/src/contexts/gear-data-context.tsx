import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { GearData } from "@squire/api/gear-data";
import { fetchGearData } from "@/lib/api";

export type GearDataState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; gear: GearData }
  | { status: "error"; message: string };

interface GearDataContextValue {
  state: GearDataState;
  load: () => void;
}

const GearDataContext = createContext<GearDataContextValue | undefined>(undefined);

export function GearDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GearDataState>({ status: "idle" });
  const loading = useRef(false);

  const load = useCallback(() => {
    if (loading.current) {
      return;
    }
    loading.current = true;
    setState({ status: "loading" });
    fetchGearData()
      .then((gear) => setState({ status: "ready", gear }))
      .catch((error: Error) => {
        loading.current = false;
        setState({ status: "error", message: error.message });
      });
  }, []);

  const value = useMemo(() => ({ state, load }), [state, load]);
  return <GearDataContext.Provider value={value}>{children}</GearDataContext.Provider>;
}

export function useGearDataContext(): GearDataState {
  const value = useContext(GearDataContext);
  if (!value) {
    throw new Error("useGearDataContext must be used inside GearDataProvider");
  }
  const { state, load } = value;
  useEffect(load, [load]);
  return state;
}
