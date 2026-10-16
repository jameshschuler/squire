# Repository Instructions

## Coding Style

- Write concise, production-ready TypeScript/JavaScript, React, Golang, SQL, and backend code.
- **Zero comments** unless logic is genuinely non-obvious or complex. Avoid self-documenting comments entirely.
- **Exception: the public SDK API.** Exported functions, types and options in `packages/sdk` get TSDoc comments, because they are the package's documentation in editors and on npm. Internal SDK code still follows the zero-comments rule.
- Keep components and functions modular and minimal.
- Always use braces for `if` statements, even single-line bodies. Write `if (existing) { return existing; }` (on separate lines), never `if (existing) return existing;`.
- Don't nest `await`. Give each awaited value its own `const` before using it: `const data = await loadGameData(client);` then `buildRecipeBook(data)`, never `buildRecipeBook(await loadGameData(client))`. The same goes for `(await x).field`, `await (await fetch(url)).json()` and passing `await x` as an argument. In tests, use `await expect(promise).resolves…` instead of `expect(await promise)`. A single `await` that's assigned, returned or cast (`const body = (await res.json()) as Body`) is fine.

## Quality & Simplicity

- **Professional, production-quality code.** Write code a senior reviewer would approve without changes: clear names, small focused units, and explicit types. Handle real failures where they happen (a request fails, a query errors, input is invalid), and nothing more. Never leave dead code, debug logging, TODOs or commented-out code behind.
- **KISS.** Choose the simplest solution that fully solves the problem. Prefer plain functions and data over classes, abstractions, generics or configuration until a second real use case demands them. No speculative features, options or extension points (YAGNI).
- **Not verbose.** Say it once, in as little code as reads clearly. Avoid redundant variables, wrapper functions that only forward arguments, defensive checks for states that can't occur, and restating types the compiler infers. Clarity beats cleverness — don't golf.
- **Pragmatic, not enterprise.** Don't add defensive null-checks or enterprise-grade error boundaries unless explicitly asked. Write pragmatic, clean, readable code.
- **Maintainable by default.** Keep functions short with a single responsibility, avoid deep nesting (return early), keep side effects at the edges, and keep modules loosely coupled so a change touches one place.
- **Never edit generated files** (the sqlc `.go` files in `v2/api/internal/db/`, `v2/web/src/routeTree.gen.ts`), by hand or by running formatters over them. Change the source (SQL queries, route files) and rerun the generator.
- **Follow existing patterns.** Match the conventions, libraries and structure already in the codebase rather than introducing new ones; add a dependency only when it clearly beats a few lines of code.

## Strategic Design

- **Think long term.** Working code isn't enough; each change should leave the design as good or better than before. Small tactical shortcuts add up to a codebase that's hard to change, so spend a little extra time on the design now instead of paying for it later.
- **Fix the design, don't work around it.** When a change doesn't fit the current structure, reshape the structure instead of bolting on a special case, flag, or duplicate path. If the cleanup is large or unrelated, raise it and do it as a separate change rather than skipping it silently.
- **Deep modules, simple interfaces.** A module should hide real complexity behind a small, obvious API. Avoid shallow layers that just pass calls through, and pull complexity down into the module so its callers stay simple.
- **Put boundaries where change happens.** Keep code that changes together in one place, and keep domain rules out of UI components and HTTP handlers so they can evolve on their own.
- **Name things after the domain.** Use the words the product uses (session, check-in, milestone) so the code reads like the problem it solves, and use one name per concept everywhere.
- **Make trade-offs visible.** When you knowingly take a shortcut, say so in the PR description with what it costs and when to revisit it. Don't leave hidden debt.
- **Strategic isn't speculative.** Design for the change you can see coming, not every change you can imagine. KISS and YAGNI still apply: a clean, simple design is the long-term one.

## Testing

- **Every change ships with tests.** New logic gets unit tests; bug fixes get a regression test that fails before the fix. Lib helpers, server functions and Go packages must be covered.
- **Test behavior, not implementation.** Assert on inputs and outputs and user-visible behavior; avoid testing private details or snapshotting large trees. Mock only external boundaries (network, DB, time).
- **Cover the edges.** Include empty, boundary, invalid and error cases, not just the happy path.
- **Keep tests simple and fast.** One behavior per test, descriptive names, minimal setup, no shared mutable state, deterministic results. Prefer table-driven tests for many similar cases.
- Run the relevant tests and confirm they pass before considering work done.

## Project Structure

- **One component per file.** Each `.tsx` file in `src/components/` exports exactly one component, and the file is named after it (`UserCard.tsx` exports `UserCard`). When a component grows a sub-component, move the sub-component to its own file instead of defining it alongside. The only exception is `src/components/ui/`, which holds shadcn primitives generated by `npx shadcn add` — leave their compound exports (`Dialog`, `DialogContent`, …) together so they can be regenerated.
- **Keep components under 150 lines.** When one grows past that, split out sub-components (each in its own file), move logic into a hook in `src/hooks/` or a helper in `src/lib/`, or move shared state into a context. Doesn't apply to `src/components/ui/`.
- **Organize components by feature.** Put components in a folder named for the screen or feature they belong to (e.g. `layout/`, `auth/`, `dashboard/`, `account/`). Components shared by several features go in a clearly named shared folder — never at the root of `src/components/`. App-specific components never go in `ui/`.
- **Non-component modules sit next to their feature.** Style maps and constants used only by one feature's components live in that feature's folder as a `.ts` file (e.g. `dashboard/dashboard-styles.ts`); logic that isn't UI-specific goes in `src/lib/`.
- **Contexts live in `src/contexts/`**, never in `src/components/`. Each file (`<name>-context.tsx`) exports its state/action types, the `XProvider` and the `useXContext()` hook.
- **Where other code lives:** routes in `src/routes/`, hooks in `src/hooks/`, server functions in `src/server/` (one file per entity), pure helpers in `src/lib/`, shared types in `src/types/`.

## Component & Code Design

- **Pure helpers live in `src/lib/`, not in components.** Formatting, unit conversion, date/day math, grouping and similar logic that doesn't need React state belongs in a lib module (e.g. `src/lib/format.ts`, `src/lib/dates.ts`, `src/lib/units.ts`) with unit tests. Only define a function inside a component when it closes over that component's state or props.
- **Never duplicate a helper or constant.** Before writing one, search `src/lib/` and reuse or extend what's there. Conversion factors and other shared constants are defined once in `src/lib/` and imported; never retype magic numbers inline.
- **Pass values, not formatters.** Lib helpers take what they need as arguments (e.g. `formatWeight(value, displayUnit)`); don't pass formatting functions down as props.
- **Use context instead of prop drilling.** When a screen shares state and actions across components (or a component needs more than ~5 state/action props), expose them through a context in `src/contexts/` — a `XProvider` plus `useXContext()` hook. Routes wrap their layout in the provider; components read from the hook and take no state/action props.
- **Props are fine for small, reusable presentational components** (layout primitives, `ui/` components, charts) whose inputs genuinely vary per use — keep them to a handful.
- **Type the domain at the source.** Give DB columns and enums precise types in the schema or generated code so server results match client types without casts.
- **Keep checks green.** Formatting, lint, typecheck, tests and build must all pass locally before pushing (CI runs them).

## Go

- **Write idiomatic Go.** Follow [Effective Go](https://go.dev/doc/effective_go) and the [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments). Code must pass `gofmt`, `go vet` and `golangci-lint`.
- **Errors are values.** Return them, don't panic. Check `err` right after the call and handle it once: return it, wrap it with context (`fmt.Errorf("load session: %w", err)`), or log it, not all three. Compare with `errors.Is`/`errors.As`, never by string.
- **Small, flat code.** Return early instead of nesting `else`. Keep the happy path on the left edge.
- **Naming.** Short, clear names; short receivers (`s *Server`); initialisms in one case (`ID`, `URL`, `userID`); no `Get` prefix on getters; package names are short, lowercase, and not repeated in identifiers (`db.Session`, not `db.DBSession`).
- **Interfaces belong to the consumer.** Define them where they're used, keep them small, accept interfaces and return concrete types. Don't create an interface until something needs it.
- **Pass `context.Context` first** to anything that does I/O, and never store it in a struct.
- **Prefer the standard library.** Reach for a dependency only when stdlib clearly falls short.
- **Tests use the standard `testing` package.** Table-driven tests for many similar cases, `t.Helper()` in helpers, hand-written fakes over mocking libraries, and `go test -race` must pass.
- **Generated code is never edited by hand.** Change the SQL in `internal/db/queries/` and run `sqlc generate`.

## Response Guidelines

- No conversational filler, preambles, or post-explanations when writing or editing code.
- Output clean code blocks directly.

### Talk to me simply

I know the domain. The problem is answers buried under qualifiers, shorthand, and names only you have open.

- Small words, short sentences, short paragraphs. One idea per sentence. If you must use a big word, explain it right after.
- Lead with the answer. First line, every time. Then the detail, if there is any. Only return what's actually necessary.
- Name things in words, not numbers or references. Never send me to another document to decode a sentence. Not "rule 3 in CLAUDE.md" — say "the rule that each component gets its own file." The file name can go at the end for whoever needs to open it.
- Just tell me what you did, did it work, and what I do now.
- If I have to decide something: 2 options max, the context I need to pick fast, and which one you'd go with.
- Tell me when I'm wrong. Say it first and say it plainly. Don't soften it, don't bury it in options, don't wait until the end. If my plan won't work, the first line is "that won't work" and then why. Being easy to read never means being agreeable.
- Same for your own mistakes. If you shipped something wrong, say so straight and fix it. No long apology.
- Keep paths, commands, filenames, and numbers exact.

## Writing Docs, READMEs and Other Prose

- Write so it reads like a person wrote it for this context, not like a template or an AI. Keep the original meaning.
- Swap generic, inflated or promotional wording for clear, specific, factual language.
- No vague sources like unnamed "experts" or "studies" unless you give concrete details.
- Use direct, plain phrasing. Cut filler such as "in order to" or "at this point in time."
- Cut excessive hedging and templated structure: predictable intros, recap summaries, "challenges" or "future outlook" sections, unless the doc genuinely needs them.
- Vary sentence length and rhythm so the prose doesn't sound uniform. Add a light human touch or point of view only when it fits the tone.
- Go easy on em dashes.
- No assistant artifacts: sign-offs, disclaimers, or mentions of being an AI.
- Prefer concrete details over generalities, and keep the tone consistent and right for the audience and purpose.

## Git & GitHub

### Hard rules

- **Never push to the default branch (`main`).** All changes land via pull request. Branch → commit → open PR.
- **Never create a new repository without confirming with me first.** Ask before any `gh repo create` or equivalent.
- **Never create a repo, fork, or push outside `jameshschuler`** without explicit confirmation.

### Branch naming

- `feature/short-description` — new features/improvements
- `bugfix/short-description` — fixes to known issues
- `hotfix/short-description` — emergency patches

### Review before committing

Before creating a commit or opening a pull request, run the /code-review skill on the pending changes. Fix any confirmed findings (or tell me about the ones you're leaving) before committing.

### Commit messages

Prefix with one of: `feat:`, `fix:`, `improvement:`, `docs:`, `refactor:`, `ci:`, `chore:`, `revert:`. An optional scope is fine (`feat(web):`, `fix(api):`). Concise description after the prefix. Commit often; avoid heavy refactoring and unrelated dependency changes in the same commit.

### Pull requests

There is no PR template. Use a short `## Summary` (what changed and why) and a `## Testing` section (what you ran and how you checked it). Keep the Claude Code co-author/attribution trailers.

### CI

- `.github/workflows/v2-ci.yml` runs on every PR and on pushes to `main`, with jobs for the API (format, vet, test, sqlc generated code, build), migrations (up, down to zero, back up) and web (format, lint, typecheck, build, audit). The `v2 CI passed` job only succeeds when every other job does. Add any new job to both its `needs` list and its result check.
- `.github/workflows/dependabot-auto-merge.yml` auto-merges Dependabot updates.
- Reusable workflows called with `permissions: {}` need the calling workflow to grant permissions at the **job level**, not the workflow level, or they fail. Pin shared workflows and actions to a version tag, not `@main`.

### Misc

- There are no git hooks. Run the same checks CI runs locally before pushing.
- Security issues/vulnerabilities are never reported in public issue trackers or PRs.
