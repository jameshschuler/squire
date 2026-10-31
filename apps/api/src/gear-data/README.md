# Gear optimizer

Given a player's gear, an activity or recipe, and a ranked list of priorities ("Fastest, then Most chests"), this module picks the set of gear to wear. It also says how sure it is: either the set is proven best, or it is proven to be within some percentage of the best possible.

The web app runs the optimizer in a Web Worker (`apps/web/src/workers/gear-solver.worker.ts`), so a search never freezes the page. The API only builds `GearData` and serves it at `/api/gear`.

## The pieces

| File                                          | What it does                                                                                                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build.ts`, `items.ts`, `pets.ts`, `types.ts` | Turn raw game data into `GearData`: every gear item with its stats per quality, pets per level, and locations.                                                        |
| `profile.ts`                                  | Who is wearing the gear. `BEST_IN_GAME` owns every item at its best quality and is max level. A `character` profile owns what their export says and has their levels. |
| `steps.ts`                                    | The game's step formula.                                                                                                                                              |
| `goals.ts`                                    | The priorities, how a set is scored against them, and the margin math.                                                                                                |
| `candidates.ts`                               | One owned item, boiled down to the numbers the search needs.                                                                                                          |
| `pruning.ts`                                  | Drops items that can never be worth wearing, and the keyword ban rules.                                                                                               |
| `search.ts`                                   | The search for the best set for one location and one scoring pass.                                                                                                    |
| `free-slots.ts`                               | Fills slots the search left empty with items that help other things.                                                                                                  |
| `optimizer.ts`                                | Runs the whole thing: locations, passes, rounds, the time limit, and the final margin.                                                                                |
| `set-stats.ts`                                | Display helpers: a set's stats added up, and bonuses tied to the location.                                                                                            |
| `slots.ts`                                    | Slot sizes (two rings, a tool count that grows with character level).                                                                                                 |

## Steps per action

From `stepsPerAction` in `steps.ts`:

```
level bonus   = min(levels above the requirement, 20) × 1.25%
efficiency    = 1 + min(level bonus + gear work efficiency, max work efficiency − 1)   (at least 0.01)
steps         = ceil(max(work required / efficiency × (1 + steps %) + flat steps, 10))
average steps = steps / (1 + min(double action, 100%))
```

Two things follow from this and shape the whole search:

- Work efficiency past the max does nothing. The search tracks how much is still "useful" (`usefulEfficiency` in `optimizer.ts`) and caps work efficiency there when comparing sets.
- Double action caps at 100%, so anything past that is also ignored.

## Scoring a set

A set's score is a list of numbers, one per priority, compared in order: the first number decides, and later numbers only break ties (`compareScores`). Higher is always better.

| Priority                                   | Number                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| Fastest                                    | `−average steps`                                                                 |
| A per-step goal (items, XP, chests, gems…) | `(1 + bonus) / average steps`, so faster sets get more of it per step            |
| Save materials                             | `(1 + double rewards) / (1 − no materials consumed)`: outputs per material spent |
| Best quality                               | the quality outcome stat                                                         |

Numbers are rounded to 9 significant digits before comparing, so floating-point noise never makes two equal sets look different.

The web app tops the user's priorities up to three with quiet tie-breakers from the activity's recommended ones (`tieBreakersFor` in `apps/web/src/lib/gear-targets.ts`). They're scored like any other priority but never show in the answer, and the margin ignores them (`checkedGoals`).

## Candidates

Each owned item becomes a `Candidate` for the current situation (activity, location, profile):

- `totals`: the stats it always gives here. Stats whose conditions don't hold (wrong skill, wrong location, too few collectibles…) are dropped.
- `setBonuses`: stats that depend on how many items from a keyword set are worn. These are only known once the whole set is chosen; `withSetBonuses` adds them up for a finished set.
- `best`: `totals` plus every helpful part of its set bonuses. This is what the item could give at most, and it's what makes the search's bounds safe.

Goal stats (chest finding, bonus XP…) go into `goalStats`, in the order `goalStats(goals)` lists them.

## Pruning items

Before searching, `prune` drops items in each slot that other items in the same slot beat outright: at least as good on every stat that matters, no worse on bans, and in at least the same set groups. If a slot holds `n` items (rings hold 2), an item is dropped once `n` others beat it, because there would always be something better to wear.

## The search (`bestSet` in `search.ts`)

Trying every combination is far too slow (a tool slot alone can have hundreds of items for six places). Instead the search walks the slots one item at a time and keeps a list of **partial sets**. For each item it considers every partial set with and without that item.

Three things keep the list small:

1. **Bounds.** For each partial set, `bound` works out the best score it could still reach: its own `optimistic` stats plus the best possible stats from every item not looked at yet (`topSums` adds up the best values per stat on its own, as if one item could give the best of everything). If that bound can't beat the best full set found so far, the partial set is dropped. This never drops the best set, because the bound is never lower than the real final score.
2. **Dominance.** `frontier` drops a partial set when another one is at least as good in every way that matters: its guaranteed stats are at least the other's optimistic stats, it has used no more slots, its bans are a subset of the other's, and it is no worse for set bonuses. This is safe for the same reason: anything the dropped set could become, the other could become too, at least as well. A set group with a "fewer than N pieces" bonus (`cappedSetGroups`) must match exactly, because more pieces can be worse there.
3. **A cap on how many partial sets are kept** (`maxStates`). When the list grows past it, the ones with the lowest bounds are cut. This, and stopping at the deadline, are the only steps that can lose the best set, so the search remembers the highest bound it ever drops: the **ceiling**. No set built from a dropped partial set can score above it.

Bans (two items that can't be worn together, like two hatchets) are stored as bits in a number (`banMasks`), so checking a clash or comparing two sets' bans is a single bitwise operation.

Before the main search, a **greedy** set (keep adding whichever item helps most) gives a starting best, so bounds start pruning right away. On the last pass, **swap repair** (`improveBySwaps`) tries swapping single items to fix small misses, and `withoutIdlePicks` removes items that add nothing.

## Proving the answer: the margin

When the search finishes, the best set found scores `found`, and every set it never fully looked at scores at most `ceiling`. So:

- If nothing was cut, or `ceiling ≤ found`, the set is the **proven best**.
- Otherwise the true best is at most `ceiling`, and the gap is `(ceiling − found) / |ceiling|` on the first priority where they differ. That's the margin: "within 2.8% of the best possible for Most chests". Earlier priorities that tie are proven.

`marginOf` computes this. `marginHolds` is the check used by the tests and the check script: it confirms a claimed margin is never smaller than the real gap to the true best.

## Running it all (`optimizeGear` in `optimizer.ts`)

1. **Locations.** An activity can happen in several places, and some gear only works in some of them. Locations whose gear bonuses would be identical are merged (`distinctLocations`); each remaining one gets its own plan (`planAt`): candidates, pruned slot groups, the scorer.
2. **Passes.** Priorities are searched one at a time: pass 1 scores only the first priority, pass 2 the first two, and so on. Each pass starts from the previous pass's set. The first pass also proves an upper limit for the first priority, and later passes clip their bounds to it (`firstGoalLimit`), so that proof carries over.
3. **Dropping locations.** Each pass runs across every remaining location before the next pass starts. After each pass, a location is dropped if even its ceiling can't match the leading location. It can't hold the answer.
4. **Rounds.** If the margin is above 1% (`CLOSE_ENOUGH`), the whole thing runs again with four times as many partial sets kept, until the count reaches 16,000. Each round's best set and tightest ceiling are kept (`tightest`).
5. **Time limit.** Everything shares one deadline (10 seconds by default). The search checks it at every item; when time is up, it stops, adds the bounds of every unfinished partial set to the ceiling, and returns what it has. The margin stays honest: it just ends up wider.
6. **Free slots.** `fillFreeSlots` puts owned items into empty slots when they add other bonuses (say, inventory space) without costing a step or lowering the score.

The result has the set, its stats and steps, the margin (`null` means proven best) and `searchMs`.

`fewestSteps` runs a quick "Fastest" search with the best gear in the game. The web app shows it as the "Min" on the steps tile.

## How it's tested

- `apps/api/test/optimizer.test.ts` compares the search with brute force (every possible set) on hundreds of random gear pools, for several priority orders, with and without the cap, and with a deliberately tiny cap and no time so margins are wide. Every claimed margin must hold.
- `apps/web/scripts/check-gear-search.ts` (`pnpm --filter @squire/web check:gear-search`, with the API running) does the same against real game data: every activity and recipe, the best gear in the game and the sample character, compared with an uncapped search. It fails if any set beats the margin it was given.
