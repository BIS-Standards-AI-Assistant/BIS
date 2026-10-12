# Contributing to BIS Standards Navigator

Thanks for helping. This is an evidence-first public-service tool: people use it to
decide which Indian Standard applies to their product and what certification it needs.
A wrong answer here has real cost, so the bar is **correct and honest** before
**impressive**.

## Ground rules

1. **Never invent BIS content.** No made-up standards, titles, clauses, certification
   routes, testing requirements, dates, statistics or confidence numbers — not in code,
   not in UI copy, not in test fixtures that could leak into the UI. When evidence is
   missing, say so ("Information not verified from the available sources"). The full
   rules are in [`docs/ui/UI_DATA_AND_TRUTH_RULES.md`](docs/ui/UI_DATA_AND_TRUTH_RULES.md).
2. **Every model call goes through the provider adapter** in `src/lib/providers/`. The app
   must keep working with no LLM configured at all (deterministic intent + evidence-only
   answers). See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
3. **No raw internal errors in API responses.** Log with `console.error("[api/v1/<route>]", err)`
   and return a generic message; driver and provider errors can contain hosts, users and keys.
4. **Validate input before doing work.** Use `z.string().trim().min(1)` for user text in
   request schemas, so blank input is a 400 rather than a pipeline run.

## Getting set up

```bash
npm ci
cp .env.example .env.local   # DATABASE_URL is the only variable most work needs
npm run dev
```

Most of the test suite needs **no database, no LLM and no network** — you can work on
almost everything without credentials. See the README's *Local setup* section for the
database and ingestion steps.

## Before you open a pull request

```bash
npm run verify    # lint + typecheck + all tests + production build
```

CI runs the same steps (plus a dependency audit and a secret-pattern scan) on every PR to
`master`, `production` and `client`.

| Command | What it covers |
|---|---|
| `npm run test:unit` | Vitest: `src/**/*.test.{ts,tsx}` and `scripts/**/*.test.ts` |
| `npm run test:ml` | Deterministic pipeline suites (normalisation, evidence aggregation, grounding, answer schema) |
| `npm run typecheck` | `tsc --noEmit` (run `npx next typegen` once on a fresh checkout) |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright against a real dev server and database (needs `.env.local`) |

### Writing tests

- Put tests next to the code: `foo.ts` → `foo.test.ts`.
- Server-only modules and API routes start with `// @vitest-environment node`.
- Mock the database with `vi.mock("@/db", …)` and assert what was (or was not) queried;
  see `src/app/api/v1/standards/[id]/route.test.ts`.
- For a bug fix, add a test that **fails without the fix** and say so in the PR.
- Tests that read the shipped datasets (`data/…`) are welcome — they catch a bad data
  regeneration before it reaches a page.
- A `beforeEach(() => mock.mockReset())` arrow *returns* the mock, and Vitest treats a
  returned function as a teardown hook and calls it. Use a block body:
  `beforeEach(() => { mock.mockReset(); })`.

## Commits and pull requests

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) with a
scope, as in the existing history:

```
fix(standards-id): keep the closing parenthesis in the matched identifier
test(confidence): pin band thresholds and signal reporting
refactor(workspace): split SourcesPanel into focused components
```

Types in use: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`.

Keep each pull request to **one concern** — a fix, a feature, or a refactor — so it can be
reviewed and reverted on its own. If a change builds on an open PR, open it against that
PR's branch and say so at the top of the description; GitHub retargets it to `master`
when the parent merges.

A good PR description says **what was wrong** (with a concrete example), **what changed**,
and **how it was verified**. The pull request template prompts for each.

## Reporting problems

- **Wrong standard, scheme, date or other BIS data:** open a *Data correction* issue and
  link the official source.
- **Bugs:** open a *Bug report* issue.
- **Security issues:** do **not** open a public issue — see [`SECURITY.md`](SECURITY.md).
