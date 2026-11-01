import { solveGear, type GearRequest } from "@/lib/gear-solution";

self.onmessage = (event: MessageEvent<GearRequest>) => {
  self.postMessage(solveGear(event.data));
};
