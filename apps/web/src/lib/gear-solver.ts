import type { GearRequest, GearSolution } from "./gear-solution";

export interface GearJob {
  result: Promise<GearSolution>;
  cancel: () => void;
}

let worker: Worker | null = null;
let running: GearJob | null = null;

export function solveInBackground(request: GearRequest): GearJob {
  running?.cancel();
  const current = (worker ??= new Worker(new URL("../workers/gear-solver.worker.ts", import.meta.url), {
    type: "module",
  }));
  let done = false;
  const stop = () => {
    done = true;
    current.terminate();
    worker = null;
  };
  const result = new Promise<GearSolution>((resolve, reject) => {
    current.onmessage = (event: MessageEvent<GearSolution>) => {
      done = true;
      resolve(event.data);
    };
    current.onerror = (event) => {
      stop();
      reject(new Error(event.message));
    };
  });
  current.postMessage(request);
  const job = {
    result,
    cancel: () => {
      if (!done) {
        stop();
      }
    },
  };
  running = job;
  return job;
}
