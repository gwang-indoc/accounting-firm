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

Authoritative TDD/checkbox/parallel/review/dev-log rules live in `openspec/schemas/openspec-superpowers/schema.yaml` — `tasks.instruction` (for authoring `tasks.md`) and `apply.instruction` (for executing it). Read those before starting work.

Baseline test commands (run before each new task group; a failing baseline must be fixed first):
- Backend: `cd backend && ./mvnw test`
- Frontend: `cd frontend && npx ng test --no-watch`
- E2E (if servers are up): `cd e2e && npx playwright test`

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

**If servers are not running during an apply/verify step:** do NOT silently skip the e2e task. Check with:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/actuator/health
curl -s -o /dev/null -w "%{http_code}" http://localhost:4200
```
If either returns `000`, stop and tell the user: "E2E needs both servers running. Start backend (`./start.sh`) and frontend (`cd frontend && npm start`), then confirm." Wait for confirmation before running the suite.

**When to add E2E tests:** see schema `tasks.instruction` — the final group of any UI-touching change must include a committed Playwright test in `e2e/` covering the affected flow.

## Skills Available

- `/git-command-push` - Stage all, commit, and push in one step

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

## Lessons Learned

Lessons from archived changes live in `docs/lessons/` — one file per archive, named `YYYY-MM-DD-<change-name>.md`.
