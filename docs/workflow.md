# OpenSpec + Superpowers Workflow

This document describes the end-to-end development workflow for this project, integrating OpenSpec (change management) with Superpowers (AI-assisted development skills).

---

## Overview

Every feature or fix follows three phases:

```
/opsx:propose  →  /opsx:apply  →  /opsx:archive
   (Design)        (Implement)      (Complete)
```

---

## Phase 1 — Design (`/opsx:propose`)

### Step 1: Trigger brainstorming

Run `/opsx:propose <change-name>`.

The `superpowers:brainstorming` skill **always runs first**, regardless of whether the change has a UI surface.

- Explore existing code, docs, and recent commits for context
- Ask clarifying questions **one at a time** to understand purpose, constraints, and success criteria
- Propose **2–3 approaches** with trade-offs and a recommendation

### Step 2: Present and approve design

- Present design sections incrementally; get approval after each section
- Cover: architecture, components, data flow, error handling, testing strategy
- Design for isolation: each unit has one clear purpose and communicates through well-defined interfaces

### Step 3: Write and commit the design spec

Write the validated design to:

```
docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md
```

Run a self-review before asking the user to review:
- No placeholders (`TBD`, `TODO`)
- No internal contradictions
- Scope is focused enough for one implementation plan
- No ambiguous requirements

Ask the user to review the spec file. Incorporate any requested changes before proceeding.

### Step 4: ⛔ Confirmation gate

**STOP.** Do not generate any OpenSpec artifacts yet.

Ask the user explicitly:
> "Design is ready. Shall I go ahead and generate the OpenSpec artifacts (proposal.md, design.md, tasks.md)?"

Wait for an explicit **"yes"** or **"go ahead"** before continuing.

### Step 5: Create the change

```bash
openspec new change "<name>"
```

This scaffolds `openspec/changes/<name>/` with `.openspec.yaml`.

### Step 6: Generate `proposal.md`

Run `openspec instructions proposal --change "<name>" --json` and write `proposal.md`.

**Required content (enforced by config.yaml rules):**
- What & Why
- **Non-Goals / Out-of-Scope** section (always required)
- Reference to the brainstorming spec under `docs/superpowers/specs/`
- Which existing capability in `openspec/specs/` is being modified (do not invent capability names)

### Step 7: Generate `design.md`

Run `openspec instructions design --change "<name>" --json` and write `design.md`.

**Required content:**
- How (architecture, components, data flow)
- **Decisions section** covering alternatives considered — not just the choice made
- Reference to the brainstorming spec as the primary input

### Step 8: Generate `tasks.md`

Run `openspec instructions tasks --change "<name>" --json` and write `tasks.md`.

**Required structure per task group:**

Every new behavior gets a RED/GREEN pair:
```
- [ ] N.X   RED  — write failing test for <behavior> → run → confirm FAILURE
- [ ] N.X+1 GREEN — minimal impl → run → confirm PASS
```

Every `## N` group ends with a code review checkpoint:
```
- [ ] N.Z   Run superpowers:requesting-code-review on diff for group N
- [ ] N.Z+1 Update docs/log/YYYY-MM-DD.md — commit hash, feature bullets, review findings, test count, TDD evidence
```

If the final group touches the UI, add these two tasks before `N.Z`:
```
- [ ] M.J  Write/update Playwright E2E test under e2e/ for the affected user flow
           1. ./start.sh                         # start backend
           2. cd frontend && npm start           # start frontend
           3. cd e2e && npx playwright test      # run E2E suite
           4. kill $(lsof -ti :4200)             # stop frontend
           5. kill $(lsof -ti :8080)             # stop backend
- [ ] M.K  Run superpowers:verification-before-completion
```

If 2+ task units within a group touch disjoint files, mark them `[parallel]` and add:
```
- [ ] N.0  Invoke superpowers:subagent-driven-development to dispatch the [parallel] units
```

---

## Phase 2 — Implementation (`/opsx:apply`)

### Step 1: Invoke TDD discipline

At session start, invoke `superpowers:test-driven-development`.

**The Iron Law:** No production code without a failing test first.
- If code was written before the test: delete it, start over
- RED phase must be verified — run the test, confirm it fails with the expected message
- GREEN phase: write only the minimal code to pass — no over-engineering

### Step 2: Read context files

Run `openspec instructions apply --change "<name>" --json`.

Read every file listed under `contextFiles`:
- `proposal.md` — what and why
- `design.md` — how
- `specs/` — capability specs
- `tasks.md` — implementation steps

### Step 3: Dispatch subagents (per task)

Invoke `superpowers:subagent-driven-development`.

For each pending task:

1. **Dispatch a fresh implementer subagent** with full task text and context (no context inherited from prior tasks)
2. **Answer any questions** the subagent raises before it begins work
3. **Subagent executes TDD:**
   - Write failing test → run → confirm RED (paste key failure lines into dev log)
   - Write minimal impl → run → confirm GREEN
   - Self-review for obvious issues
4. **Subagent commits** test + implementation together

### Step 4: Spec compliance review

Dispatch a fresh **spec-reviewer subagent**.

Checks:
- Does the code implement everything the spec requires?
- Does the code add anything the spec did not ask for?

If issues are found → implementer subagent fixes → spec reviewer re-reviews.

✅ Only proceed to code quality review once spec compliance is confirmed.

### Step 5: Code quality review

Dispatch a fresh **code-quality-reviewer subagent**.

Checks:
- Naming, structure, separation of concerns
- No code smells, anti-patterns, or unnecessary complexity
- Error handling at system boundaries

If issues are found → implementer subagent fixes → code quality reviewer re-reviews.

✅ Only mark the task complete once both reviews pass.

### Step 6: Update task checkbox

**Immediately** after a task is verified complete:

```
- [ ]  →  - [x]
```

Never batch checkbox updates. A coordinator must update every checkbox a subagent finished before dispatching the next subagent.

### Step 7: Code review checkpoint (N.Z)

At the end of each task group, invoke `superpowers:requesting-code-review`.

- Get `BASE_SHA` (start of group) and `HEAD_SHA` (end of group)
- Dispatch a code-reviewer subagent with the diff
- **CRITICAL / HIGH findings must be fixed** before moving to the next group
- Important findings should be fixed before proceeding
- Minor findings are noted for later

### Step 8: Update dev log (N.Z+1)

Write or append to `docs/log/YYYY-MM-DD.md`:

```md
### N. Feature Name

**Commit:** `<git hash>`

**Feature:**
- Brief bullet points of what was done

**Code Review Findings:**
| Severity | Issue | Fix |
|---|---|---|

**Tests:** X total passing (Y newly added)

**TDD Evidence:**
    AssertionError: expected X to equal Y   ← paste key RED failure lines
```

### Step 9: E2E test (M.J — if UI touched)

Write or update a Playwright test in `e2e/` covering the full user flow:
- Explicit URL, user actions, expected outcomes
- Run the full sequence (start backend → start frontend → run Playwright → stop both)

All five commands must complete cleanly. No orphan processes.

### Step 10: Verification before completion (M.K)

Invoke `superpowers:verification-before-completion`.

**The Iron Law:** No completion claim without running fresh verification.

```bash
# Backend
cd backend && ./mvnw test

# Frontend
cd frontend && npx ng test --no-watch

# Grep checks
grep -r "System.out.println" backend/src/main/
grep -r "console.log" frontend/src/app/
```

Also: diff review — every changed line must trace directly to the requirement.

Only after all checks pass: state completion with evidence.

---

## Phase 3 — Completion (`/opsx:archive`)

### Step 1: Check artifact completion

```bash
openspec status --change "<name>" --json
```

If any artifacts are not `done`, warn the user and ask for confirmation before continuing.

### Step 2: Check task completion

Read `tasks.md`. Count `- [ ]` (incomplete) vs `- [x]` (complete).

If incomplete tasks exist, warn the user and ask for confirmation before continuing.

### Step 3: Assess delta spec sync

Check `openspec/changes/<name>/specs/` for delta specs.

If delta specs exist:
- Compare each delta spec against `openspec/specs/<capability>/spec.md`
- Show a combined summary of what would change (adds, modifications, removals)
- Prompt the user:
  - **"Sync now (recommended)"** — apply delta to main specs via `openspec-sync-specs`
  - **"Archive without syncing"** — skip (note this as a warning in the archive summary)

If no delta specs exist, proceed directly to archive.

### Step 4: Archive the change

```bash
mkdir -p openspec/changes/archive
mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
```

If the target path already exists: stop, report the conflict, and suggest options.

### Step 5: Print archive summary

```
## Archive Complete

Change:    <name>
Schema:    spec-driven
Archived:  openspec/changes/archive/YYYY-MM-DD-<name>/
Specs:     ✓ Synced to main specs  (or: Sync skipped)

All artifacts complete. All tasks complete.
```

---

## Quick Reference

| Command | Purpose | Skills invoked |
|---|---|---|
| `/opsx:propose` | Design + plan a change | `brainstorming` |
| `/opsx:apply` | Implement tasks | `test-driven-development`, `subagent-driven-development`, `requesting-code-review`, `verification-before-completion` |
| `/opsx:archive` | Close out a completed change | `openspec-sync-specs` |

## Key Rules (from config.yaml)

| Rule | Where it applies |
|---|---|
| Brainstorming always runs before artifacts | `/opsx:propose` step 1 |
| Confirmation gate before artifact generation | `/opsx:propose` step 4 |
| Every new behavior needs a RED/GREEN pair | `tasks.md` generation |
| Independent units within a group → `[parallel]` + N.0 subagent dispatch | `tasks.md` generation |
| Two-stage review: spec compliance first, then quality | `/opsx:apply` steps 4–5 |
| Checkbox updated immediately on task completion | `/opsx:apply` step 6 |
| CRITICAL/HIGH review findings block the next group | `/opsx:apply` step 7 |
| E2E test required for any UI-touching change | `/opsx:apply` step 9 |
| No completion claim without fresh verification evidence | `/opsx:apply` step 10 |
| Spec sync assessed before every archive | `/opsx:archive` step 3 |
