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
└── openspec/         # OpenSpec change artifacts
```

> See README.md for install and run instructions.

## Backend (Spring Boot)

### Key Architecture

- **Package structure**: `com.gwhaitech.accountingfirm`
- **Authentication**: Spring Security with Google OAuth2 (`spring-boot-starter-oauth2-client`). Google client ID/secret are in `application.yml` via environment variables `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- **Database**: PostgreSQL with Spring Data JPA. Schema managed via Flyway migrations in `src/main/resources/db/migration/`.
- **Configuration**: `application.yml` for defaults, `application-dev.yml` for local dev, `application-prod.yml` for production.

## Frontend (Angular)

### Key Architecture

- **Auth**: Angular integrates with the backend's Google OAuth2 flow. Auth state managed via a dedicated `AuthService`; HTTP interceptor attaches the session cookie or token to API requests.
- **API communication**: `HttpClient` services under `src/app/core/services/`. Backend base URL configured via `environment.ts`.
- **Routing**: Feature-based lazy-loaded modules.

## Skills Available

- `/git-commit-push` - Atomic git workflow

## OpenSpec Workflow

Change proposals and tasks live in `openspec/`. Use `/opsx:propose` to create a new change, `/opsx:apply` to implement it, and `/opsx:archive` when done.
All changes, specs, and archives live under `openspec/` at the project root.

**Important — `/opsx:propose` + brainstorming:** `/opsx:propose` triggers `superpowers:brainstorming` first. When brainstorming finishes, it will try to invoke `superpowers:writing-plans` as its terminal state — **ignore that**. Return to the `/opsx:propose` flow and generate the OpenSpec artifacts (`proposal.md`, `design.md`, `tasks.md`). The `writing-plans` terminal state only applies when brainstorming is run standalone.

**Important — `/opsx:apply` required skills:** Before implementing any task, ALWAYS invoke these skills in order:
1. `superpowers:test-driven-development` — at session start, before writing any code
2. `superpowers:subagent-driven-development` — to dispatch a fresh subagent per `[parallel]` task with two-stage review (spec compliance, then code quality)
3. `superpowers:requesting-code-review` — at each task-group checkpoint (`N.Z` tasks)

## Coding Guidelines

Behavioral guidelines to reduce common LLM coding mistakes.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
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
- If you notice unrelated dead code, mention it - don't delete it.

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