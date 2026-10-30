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
  ms: number;
}

interface Answer {
  fast: Run;
  exact: Run;
}

type Outcome = "same" | "missed" | "exact worse" | "timed out" | "failed";

const FAILING: Outcome[] = ["missed", "exact worse", "failed"];

interface Result {
  job: Job;
  outcome: Outcome;
  answer: Answer | null;
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
    const finish = (outcome: Outcome, answer: Answer | null) => {
      clearTimeout(timer);
      worker.off("message", onAnswer);
      worker.off("error", onError);
      worker.off("exit", onError);
      resolve({ job, outcome, answer });
    };
    const onAnswer = (answer: Answer) => {
      const comparison = compareScores(answer.exact.score, answer.fast.score);
      finish(comparison > 0 ? "missed" : comparison < 0 ? "exact worse" : "same", answer);
    };
    const onError = () => finish("failed", null);
    const timer = setTimeout(() => finish("timed out", null), timeoutMs);
    worker.on("message", onAnswer);
    worker.on("error", onError);
    worker.on("exit", onError);
    worker.postMessage(job);
  });
}

function serve({ gear, profiles }: Shared) {
  parentPort!.on("message", (job: Job) => {
    const run = (maxStates?: number): Run => {
      const start = performance.now();
      const suggestion = optimizeGear(gear, profiles[job.profile]!, job.target, job.goals, { maxStates });
      return { steps: suggestion.result.steps, score: suggestion.score, ms: Math.round(performance.now() - start) };
    };
    parentPort!.postMessage({ fast: run(), exact: run(Number.POSITIVE_INFINITY) } satisfies Answer);
  });
}

function report(results: Result[]) {
  const describe = ({ job }: Result) => `${job.name} · ${job.profile} · ${job.goals.join(" › ")}`;
  for (const result of results.filter((r) => r.outcome !== "same")) {
    const detail = result.answer
      ? ` (limited ${result.answer.fast.steps} steps, exact ${result.answer.exact.steps} steps)`
      : "";
    console.log(`${result.outcome.toUpperCase()}: ${describe(result)}${detail}`);
  }
  const counts = new Map<Outcome, number>();
  for (const { outcome } of results) {
    counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
  }
  const slowest = results
    .filter((r) => r.answer)
    .sort((a, b) => b.answer!.exact.ms - a.answer!.exact.ms)
    .slice(0, 3)
    .map((r) => `${describe(r)} ${r.answer!.exact.ms} ms`);
  console.log([...counts].map(([outcome, count]) => `${count} ${outcome}`).join(", "));
  console.log(`Slowest exact searches: ${slowest.join("; ")}`);
}
