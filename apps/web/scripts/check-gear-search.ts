import { existsSync, readFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { parseArgs } from "node:util";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { parseCharacterExport } from "@squire/api/character";
import {
  BEST_IN_GAME,
  compareScores,
  optimizeGear,
  type GearData,
  type GoalId,
  type OptimizeTarget,
  type PlayerProfile,
  type Score,
} from "@squire/api/gear-data";
import type { RecipeBook } from "@squire/api/recipe-book";
import { gearTargets, optimizeTarget, recommendedGoals } from "../src/lib/gear-targets";

interface Job {
  id: number;
  name: string;
  profile: string;
  goals: GoalId[];
  target: OptimizeTarget;
}

interface Run {
  steps: number;
  score: Score;
  proven: boolean;
  ms: number;
}

type Outcome = "same" | "missed" | "wrong proof" | "exact worse" | "timed out" | "failed";

const FAILING: Outcome[] = ["wrong proof", "exact worse", "failed"];

interface Result {
  job: Job;
  outcome: Outcome;
  fast: Run | null;
  exact: Run | null;
}

interface Shared {
  gear: GearData;
  profiles: Record<string, PlayerProfile>;
}

const DEFAULT_CHARACTER = new URL("../../../sample_player_data.json", import.meta.url);

if (isMainThread) {
  await main();
} else {
  serve(workerData as Shared);
}

async function main() {
  const { values } = parseArgs({
    options: {
      api: { type: "string", default: "http://localhost:3000" },
      character: { type: "string" },
      timeout: { type: "string", default: "60" },
    },
  });
  const [gear, book] = await Promise.all([
    load<GearData>(values.api, "/api/gear"),
    load<RecipeBook>(values.api, "/api/recipes"),
  ]);
  const timeoutMs = Number(values.timeout) * 1000;
  if (!(timeoutMs > 0)) {
    throw new Error(`--timeout takes a number of seconds, not "${values.timeout}"`);
  }
  const characterPath = values.character ?? (existsSync(DEFAULT_CHARACTER) ? DEFAULT_CHARACTER : null);
  const profiles: Record<string, PlayerProfile> = {
    "best in game": BEST_IN_GAME,
    ...(characterPath && {
      character: { kind: "character", character: parseCharacterExport(readFileSync(characterPath, "utf8")) },
    }),
  };
  const jobs = buildJobs(book, Object.keys(profiles));
  const lanes = Math.max(availableParallelism() - 1, 1);
  console.log(`Checking ${jobs.length} searches on ${lanes} threads, ${values.timeout}s limit each…`);
  const results = await runAll(jobs, { gear, profiles }, lanes, timeoutMs);
  report(results);
  process.exitCode = results.some((r) => FAILING.includes(r.outcome)) ? 1 : 0;
}

async function load<T>(api: string, path: string): Promise<T> {
  const response = await fetch(new URL(path, api));
  if (!response.ok) {
    throw new Error(`${path} answered ${response.status}. Is the API running at ${api}?`);
  }
  return (await response.json()) as T;
}

function buildJobs(book: RecipeBook, profiles: string[]): Job[] {
  const goalSets = (target: ReturnType<typeof gearTargets>[number]): GoalId[][] => {
    const recommended = recommendedGoals(target);
    return recommended.join() === "steps" ? [["steps"]] : [["steps"], recommended];
  };
  return gearTargets(book)
    .flatMap((target) =>
      profiles.flatMap((profile) =>
        goalSets(target).map((goals) => ({
          name: target.name,
          profile,
          goals,
          target: optimizeTarget(target, undefined),
        })),
      ),
    )
    .map((job, id) => ({ ...job, id }));
}

async function runAll(jobs: Job[], shared: Shared, lanes: number, timeoutMs: number): Promise<Result[]> {
  const queue = [...jobs];
  const results: Result[] = [];
  const spawn = () => new Worker(new URL(import.meta.url), { workerData: shared, execArgv: process.execArgv });
  const lane = async () => {
    let worker = spawn();
    for (let job = queue.shift(); job; job = queue.shift()) {
      const result = await runJob(worker, job, timeoutMs);
      if (result.outcome === "timed out" || result.outcome === "failed") {
        await worker.terminate();
        worker = spawn();
      }
      results.push(result);
      process.stdout.write(`\r${results.length}/${jobs.length}`);
    }
    await worker.terminate();
  };
  await Promise.all(Array.from({ length: lanes }, lane));
  process.stdout.write("\n");
  return results.sort((a, b) => a.job.id - b.job.id);
}

function runJob(worker: Worker, job: Job, timeoutMs: number): Promise<Result> {
  return new Promise((resolve) => {
    let fast: Run | null = null;
    const finish = (outcome: Outcome, exact: Run | null) => {
      clearTimeout(timer);
      worker.off("message", onRun);
      worker.off("error", onError);
      worker.off("exit", onError);
      resolve({ job, outcome, fast, exact });
    };
    const onRun = (run: Run) => {
      if (!fast) {
        fast = run;
        return;
      }
      finish(outcomeOf(compareScores(run.score, fast.score), fast.proven), run);
    };
    const onError = () => finish("failed", null);
    const timer = setTimeout(() => finish("timed out", null), timeoutMs);
    worker.on("message", onRun);
    worker.on("error", onError);
    worker.on("exit", onError);
    worker.postMessage(job);
  });
}

function outcomeOf(comparison: number, proven: boolean): Outcome {
  if (comparison > 0) {
    return proven ? "wrong proof" : "missed";
  }
  return comparison < 0 ? "exact worse" : "same";
}

function serve({ gear, profiles }: Shared) {
  parentPort!.on("message", (job: Job) => {
    const run = (maxStates?: number): Run => {
      const { result, score, proven, searchMs } = optimizeGear(gear, profiles[job.profile]!, job.target, job.goals, {
        maxStates,
      });
      return { steps: result.steps, score, proven, ms: searchMs };
    };
    parentPort!.postMessage(run());
    parentPort!.postMessage(run(Number.POSITIVE_INFINITY));
  });
}

function report(results: Result[]) {
  const describe = ({ job }: Result) => `${job.name} · ${job.profile} · ${job.goals.join(" › ")}`;
  for (const result of results.filter((r) => r.outcome !== "same")) {
    const { fast, exact } = result;
    const limited = fast && `limited ${fast.steps} steps`;
    const detail = limited ? ` (${limited}, ${exact ? `exact ${exact.steps} steps` : "exact didn't finish"})` : "";
    console.log(`${result.outcome.toUpperCase()}: ${describe(result)}${detail}`);
  }
  const counts = new Map<Outcome, number>();
  for (const { outcome } of results) {
    counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
  }
  const slowest = results
    .flatMap((r) => (r.exact ? [{ result: r, ms: r.exact.ms }] : []))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 3)
    .map(({ result, ms }) => `${describe(result)} ${ms} ms`);
  const proven = results.filter((r) => r.fast?.proven).length;
  console.log([...counts].map(([outcome, count]) => `${count} ${outcome}`).join(", "));
  console.log(`${proven} of ${results.length} searches proved their own set is the best`);
  console.log(`Slowest exact searches: ${slowest.join("; ")}`);
}
