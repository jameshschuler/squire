import { afterEach, describe, expect, it, vi } from "vitest";
import type { GearRequest } from "@/lib/gear-solution";

class FakeWorker {
  static created: FakeWorker[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  posted: unknown[] = [];
  terminated = false;
  constructor() {
    FakeWorker.created.push(this);
  }
  postMessage(message: unknown) {
    this.posted.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(data: unknown) {
    this.onmessage?.({ data });
  }
  fail(message: string) {
    this.onerror?.({ message });
  }
}

const request = { goals: ["steps"] } as unknown as GearRequest;

async function freshSolver() {
  vi.resetModules();
  FakeWorker.created = [];
  vi.stubGlobal("Worker", FakeWorker);
  const { solveInBackground } = await import("@/lib/gear-solver");

  return solveInBackground;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("solveInBackground", () => {
  it("sends the request to a worker and resolves with its answer", async () => {
    const solve = await freshSolver();
    const job = solve(request);
    const [worker] = FakeWorker.created;

    expect(worker!.posted).toEqual([request]);
    worker!.reply({ goals: ["steps"] });
    await expect(job.result).resolves.toEqual({ goals: ["steps"] });
  });

  it("reuses the worker for the next request once the last one is done", async () => {
    const solve = await freshSolver();
    const first = solve(request);

    FakeWorker.created[0]!.reply({ goals: ["steps"] });
    await first.result;
    first.cancel();
    solve(request);
    expect(FakeWorker.created).toHaveLength(1);
    expect(FakeWorker.created[0]!.terminated).toBe(false);
  });

  it("stops a search still running when cancelled, and starts a new worker next time", async () => {
    const solve = await freshSolver();

    solve(request).cancel();
    expect(FakeWorker.created[0]!.terminated).toBe(true);
    solve(request);
    expect(FakeWorker.created).toHaveLength(2);
  });

  it("stops the search still running when a new one starts", async () => {
    const solve = await freshSolver();

    solve(request);
    solve(request);
    expect(FakeWorker.created[0]!.terminated).toBe(true);
    expect(FakeWorker.created).toHaveLength(2);
  });

  it("fails the job when the worker throws", async () => {
    const solve = await freshSolver();
    const job = solve(request);

    FakeWorker.created[0]!.fail("boom");
    await expect(job.result).rejects.toThrow("boom");
  });

  it("starts a new worker after one fails, so a broken worker never gets reused", async () => {
    const solve = await freshSolver();
    const failed = solve(request);

    FakeWorker.created[0]!.fail("could not load");
    await expect(failed.result).rejects.toThrow("could not load");

    const retry = solve(request);

    FakeWorker.created[1]!.reply({ goals: ["steps"] });

    expect(FakeWorker.created[0]!.terminated).toBe(true);
    await expect(retry.result).resolves.toEqual({ goals: ["steps"] });
  });
});
