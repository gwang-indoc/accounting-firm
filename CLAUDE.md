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

```
- [ ] N.X RED  — write failing test → run ./mvnw test -Dtest=X → confirm FAILURE
- [ ] N.X+1 GREEN — write minimal impl → run ./mvnw test -Dtest=X → confirm PASS
```

## Frontend (Angular)

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

Change proposals and tasks live in `openspec/`. Use `/opsx:propose` to create a new change, `/opsx:apply` to implement it, and `/opsx:archive` when done.
All changes, specs, and archives live under `openspec/` at the project root.

**Important — `/opsx:propose` + brainstorming:** `/opsx:propose` triggers `superpowers:brainstorming` first. When brainstorming finishes, it will try to invoke `superpowers:writing-plans` as its terminal state — **ignore that**. Return to the `/opsx:propose` flow and generate the OpenSpec artifacts (`proposal.md`, `design.md`, `tasks.md`). The `writing-plans` terminal state only applies when brainstorming is run standalone.

**Important — confirmation before artifacts:** After brainstorming finishes and the design spec is written and committed, **stop and ask the user to confirm** before generating any OpenSpec artifacts. Do not auto-proceed. Wait for an explicit "yes" / "go ahead" before calling `openspec new change` or writing `proposal.md`, `design.md`, specs, or `tasks.md`.

**Important — `/opsx:apply` required skills:** Before implementing any task, ALWAYS invoke these skills in order:
1. `superpowers:test-driven-development` — at session start, before writing any code
2. `superpowers:subagent-driven-development` — to dispatch a fresh subagent per `[parallel]` task with two-stage review (spec compliance, then code quality)
3. `superpowers:requesting-code-review` — at each task-group checkpoint (`N.Z` tasks)

**Important — `tasks.md` required steps per group:** Every `## N` group must end with:
```
- [ ] N.Z   Run superpowers:requesting-code-review on the diff for group N
- [ ] N.Z+1 Update docs/log/YYYY-MM-DD.md — commit hash, feature bullets, review findings, test count
```
For the final group (if UI is touched), include these two tasks immediately before `N.Z`:
```
- [ ] M.J Write/update Playwright E2E test under `e2e/` for the affected user flow; commit the file. Run:
         1. ./start.sh                          # start backend
         2. cd frontend && npm start            # start frontend
         3. cd e2e && npx playwright test       # run E2E suite
         4. kill $(lsof -ti :4200)              # stop frontend
         5. kill $(lsof -ti :8080)              # stop backend
- [ ] M.K Run superpowers:verification-before-completion (cd backend && ./mvnw test; cd frontend && npx ng test --no-watch; grep for System.out.println + console.log; diff review)
```

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

### 5. Checkbox Discipline

**Mark each task complete immediately after finishing it. Never batch updates.**

When working through `tasks.md`:
- Update `- [ ]` to `- [x]` as soon as the task is done, before moving to the next one.
- If a subagent completes work, the coordinator must update every checkbox that subagent finished before dispatching the next subagent.
- A checkbox marked `[x]` means the work is done AND verified — not just "I think it's done".

## Dev Log Practice

Every task group in `tasks.md` MUST include a log update step. When generating `tasks.md` (during `/opsx:propose`), add this task at the end of each `## N` group, after the code-review checkpoint:

```
- [ ] N.Z+1 Update docs/log/YYYY-MM-DD.md — add entry for group N with commit hash, feature bullet points, code review findings, and test count
```

Log file path: `docs/log/YYYY-MM-DD.md` — name the file by date. If the file for that day does not exist, create it.

### Each log entry should include

```md
### N. Feature Name

**Commit:** `<git hash>`

**Feature:**

- Briefly describe what was done using bullet points

**Code Review Findings, if any:**
| Severity | Issue | Fix |
|---|---|---|

**Tests:** X tests all passed, including Y newly added tests
```

### Rules

- Log update is a required task in every group — not optional, not deferred.
- Use `- [ ]` for pending items and `- [x]` for completed items.
- Keep a **To Do** section at the end of the log, listing the next batch of work or known issues.
