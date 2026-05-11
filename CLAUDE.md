# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web application for an accounting firm. Monorepo containing a Spring Boot backend and Angular frontend.

**Tech Stack:**
- Backend: Java 21, Spring Boot 3.5, PostgreSQL
- Frontend: Angular 21
- Authentication: Google OAuth2

## Repository Structure

```
accounting-firm/
├── backend/          # Spring Boot application
├── frontend/         # Angular application
├── e2e/              # Playwright end-to-end tests
├── docs/log/         # Daily dev logs (YYYY-MM-DD.md)
└── openspec/         # OpenSpec change artifacts
```

> See README.md for install and run instructions.

## Backend (Spring Boot)

### Key Architecture

- **Package structure**: `com.gwhaitech.accountingfirm`
- **Layers**: Controller → Service → Repository (Spring Data JPA)
- **Authentication**: Spring Security with Google OAuth2 (`spring-boot-starter-oauth2-client`). OAuth2 entry point is `GET /oauth2/authorization/google` — **not** `/api/auth/login`. Google client ID/secret via env vars `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- **JWT**: Issued as an `httpOnly`, `SameSite=Strict` cookie after OAuth2 success. Secret via `JWT_SECRET` env var — **must be at least 32 characters**.
- **Database**: PostgreSQL with Spring Data JPA. Schema managed via Flyway migrations in `src/main/resources/db/migration/`. Never edit existing migrations — always create a new versioned file.
- **Configuration**: `application.yml` (defaults), `application-dev.yml` (local dev), `application-prod.yml` (prod). All secrets via env vars — no hardcoded values.

### Backend Tests

- Tests live in `backend/src/test/java/` mirroring the main source layout.
- Use `@DataJpaTest` for repository/entity slices, `@WebMvcTest` for controller slices, `@SpringBootTest` for integration tests.
- **No Testcontainers** — Docker Desktop on macOS has API compatibility issues. Use `@DataJpaTest` + `@AutoConfigureTestDatabase(replace = NONE)` + `@TestPropertySource` pointing to the local PostgreSQL at `localhost:5432`.
- **`useTestClasspath=false`** is set in the spring-boot-maven-plugin. This prevents `src/test/resources/application.yml` from leaking onto the `spring-boot:run` classpath.
- Run all tests: `cd backend && ./mvnw test`
- Run single class: `./mvnw test -Dtest=ClassName`

### TDD Discipline

Write the failing test first. **The RED phase must be verified** — run the test, confirm it fails with the expected message, then implement. Do not mark a RED task complete without running the test and seeing it fail.

The exact RED/GREEN task pattern, parallel dispatch, code-review checkpoint, dev log update, and checkbox discipline rules live in the openspec-superpowers schema's `tasks.instruction` (for authoring tasks.md) and `apply.instruction` (for executing it). The schema is the source of truth — see `openspec/schemas/openspec-superpowers/schema.yaml`.

**Only GREEN tests are committed to the codebase.** The committed test suite must always be fully passing — no bare failing tests. A RED test is written, verified to fail, and then immediately implemented and made GREEN before committing. The RED failure output is not code; it is captured in the dev log as TDD evidence (proof the test genuinely failed before the implementation existed).

**Tests that represent planned-but-not-yet-implemented behaviour** must be tagged with a skip annotation so they do not pollute the suite or mislead AI agents:
- JUnit 5: `@Disabled("planned — not yet implemented")`
- Vitest / Jasmine: `it.todo(...)` or `xit(...)` / `xdescribe(...)`

A tagged test is a clear promise. An untagged failing test is an undiagnosed bug.

**Only GREEN tests stay permanently.** Once a test goes GREEN it must never be deleted — the committed test files accumulate all passing tests over time and serve as the regression suite for every future task group.

**Before starting each new task group**, run the full test suite to confirm the baseline is green:
- Backend: `cd backend && ./mvnw test`
- Frontend: `cd frontend && npx ng test --no-watch`
- E2E (if servers are up): `cd e2e && npx playwright test`

A failing baseline must be fixed before new work begins.

## Frontend (Angular)

> **UI Design Guide:** `docs/ui-design-guide.md` — covers the Angular Material component library, colour tokens, typography, spacing, layout conventions, and accessibility rules. Consult it before building any new UI component.

### Key Architecture

- **Angular version**: 21, standalone components, **zoneless** change detection (`provideZonelessChangeDetection()`). Do not use `provideZoneChangeDetection()` — Zone.js is not installed.
- **Auth**: `AuthService` manages auth state via signals (`currentUser = signal<UserDto | null>(null)`, `isAuthenticated = computed(...)`). Bootstrapped via `APP_INITIALIZER` calling `loadCurrentUser()` before first render.
- **HTTP**: `CredentialsInterceptor` attaches `withCredentials: true` to every request so the JWT cookie is sent automatically.
- **Routing**: Feature-based lazy-loaded routes. `AuthGuard` protects `/portal/**` — redirects unauthenticated users to `/`.
- **API communication**: `HttpClient` services under `src/app/core/services/`. Backend base URL in `environment.ts`.

### Angular Dev Proxy

`proxy.conf.json` forwards these paths to `http://localhost:8080`:

| Path prefix | Purpose |
|---|---|
| `/api` | REST API calls |
| `/oauth2` | OAuth2 authorization entry point |
| `/login/oauth2` | OAuth2 callback handler |

**All three are required.** Omitting `/oauth2` breaks the login flow — the browser stays on `localhost:4200` and never reaches Spring Security.

### Frontend Tests

- Vitest + Angular TestBed (not Karma/Jasmine). Use `vi.fn()` for mocks, `toBe(true)` not `toBeTrue()`.
- Run all tests: `cd frontend && npx ng test --no-watch`
- Run single file: `npx ng test --include='**/my.component.spec.ts'`

## E2E Tests (Playwright)

E2E tests live under `e2e/` at the project root. Run with:

```bash
cd e2e && npx playwright test          # all tests
npx playwright test --grep "login"     # single test
```

**Requirements before running:** backend must be started (`./start.sh`) and frontend must be started (`cd frontend && npm start`).

**When to add E2E tests:** every change that introduces or modifies a UI flow must include a Playwright test in `e2e/` covering that flow. Ad-hoc browser automation that is not saved to disk does not count — the test must be committed.

## Skills Available

- `/git-command-push` - Stage all, commit, and push in one step

## OpenSpec Workflow

Four stages: **Explore → Propose → Apply → Archive**. Each is a slash command in `.claude/commands/opsx/`.

| Command | Purpose | Key artifacts |
|---|---|---|
| `/opsx:explore` | Think through ideas; produce draft `design.md` in `openspec/changes/_draft/<topic>/` (gitignored). Invokes `superpowers:brainstorming` as REVIEWER. Offers Visual Companion for UI. | Draft `design.md` |
| `/opsx:propose` | Promote the draft into `openspec/changes/<name>/`, STOP and confirm, then generate `proposal.md`, `specs/`, `tasks.md`. | All change artifacts |
| `/opsx:apply` | Implement tasks per `tasks.md`, following TDD/review/checkpoint rules from schema's `apply.instruction`. | Working code + dev log entries |
| `/opsx:archive` | Move change to `openspec/changes/archive/`, sync delta specs, draft per-change lessons to `docs/lessons/YYYY-MM-DD-<name>.md` (user-reviewed). | Archived change + lessons file |

Schema: `openspec/schemas/openspec-superpowers/schema.yaml` is the source of truth for artifact-content rules and apply-time discipline. The slash commands carry orchestration only.

Manual-control commands `/opsx:new`, `/opsx:continue`, `/opsx:ff` remain available for advanced flows; they delegate to the schema via `openspec status` and `openspec instructions`.

## Coding Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Dev Log Practice

Dev log entries live at `docs/log/YYYY-MM-DD.md` — one file per date, created on first use. The schema (`tasks.instruction`) is what requires a log update task in every `## N` group; this section defines what each entry looks like.

### Each log entry should include

```md
### N. Feature Name

**Commit:** `<git hash>`

**Feature:**

- Briefly describe what was done using bullet points

**Code Review Findings, if any:**
| Severity | Issue | Fix |
|---|---|---|

**Tests:** X total passing (Y newly added in this group)

**TDD Evidence (for each new test added in this group):**

    AssertionError: expected 'static' to equal 'fixed'
    Expected: "fixed"
    Received: "static"

_Paste the key RED failure lines from the terminal that prove each new test failed before the implementation was written. Omit if no new tests were added._
```

### Rules

- Use `- [ ]` for pending items and `- [x]` for completed items.
- Keep a **To Do** section at the end of the log, listing the next batch of work or known issues.
