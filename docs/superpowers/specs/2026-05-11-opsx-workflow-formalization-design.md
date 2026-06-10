# Design: Formalize OPSX + Superpowers Workflow

**Date:** 2026-05-11
**Status:** Design — pending user approval before implementation planning
**Author:** Brainstorm session with gwang

## Context

The project already pairs OpenSpec (change management) with Anthropic Superpowers (TDD, brainstorming, code review). Today the integration is partial: brainstorming is wired into `/opsx:propose`, TDD/review rules are scattered across `openspec/config.yaml.rules.*` and `CLAUDE.md`, and there's no formal home for design exploration before a change is created. The default `spec-driven` schema enforces a proposal-first ordering that doesn't match the design-first reality of the new flow.

This design formalizes a four-stage workflow (Explore → Propose → Apply → Archive), introduces a project-local OpenSpec schema (`openspec-superpowers`) whose dependency graph is design-first, and consolidates rule content so each piece has exactly one source of truth.

## Goals

- One coherent flow: **Explore → Propose → Apply → Archive**, each stage with a clear input and output.
- A draft area for exploration before a change is created, so users can think and produce `design.md` without committing to a kebab-case change name.
- `superpowers:brainstorming` becomes the **reviewer** of an existing design, not the creator. The design is produced by exploration.
- Visual Companion captures UI choices into the same `design.md`.
- A project-local schema, `openspec-superpowers`, whose dependency graph is design-first: `design → proposal → specs → tasks → apply`.
- `/opsx:archive` produces a per-change lessons-learned file under `docs/lessons/` and updates README only on explicit user opt-in.
- Single source of truth for every rule: artifact-content rules in schema `instruction:` blocks; orchestration in command md files; project-wide facts in `CLAUDE.md`. `openspec/config.yaml.rules.*` is emptied.

## Non-Goals

- Changing the `openspec` CLI itself.
- Replacing the existing dev log practice (`docs/log/YYYY-MM-DD.md`) — it stays.
- Reworking `/opsx:new`, `/opsx:continue`, `/opsx:ff` — they keep their current shape and pick up the new schema's ordering automatically through `openspec status` and `openspec instructions`.
- Auto-extracting lessons without user review.

## Approach

### Stage map

```
/opsx:explore <topic>
  ├─ writes openspec/changes/_draft/<topic>/design.md   (uncommitted; _draft/ is gitignored)
  ├─ invokes Skill superpowers:brainstorming as REVIEWER
  ├─ updates design.md based on findings
  ├─ if UI involved: runs Visual Companion, saves chosen UI into design.md
  └─ leaves draft uncommitted in _draft/ until /opsx:propose moves it

/opsx:propose [<name>]
  ├─ draft exists in _draft/<topic>/:
  │    1. ask for final kebab-case <name>
  │    2. openspec new change <name>
  │    3. mv _draft/<topic>/design.md → changes/<name>/design.md
  │    4. rmdir _draft/<topic>/
  │    5. STOP and confirm before generating remaining artifacts
  │    6. generate proposal.md, specs/, tasks.md
  └─ no draft found: prompt user
       (1) run /opsx:explore first
       (2) brainstorm in-line now (fall back to current behavior)
       (3) skip and describe directly

/opsx:apply <name>
  └─ existing flow; rules now live in schema's apply.instruction (injected via
     `openspec instructions apply`). Command file orchestrates only.

/opsx:archive <name>
  ├─ existing flow (status check, sync delta specs, move dir)
  ├─ NEW: Claude scans artifacts + recent dev log → drafts lessons bullets
  ├─ user reviews/edits/approves
  ├─ writes docs/lessons/YYYY-MM-DD-<name>.md
  └─ asks "update README.md? (y/n)" — only touch if yes
```

### File and path conventions

| Path | Purpose | Lifecycle |
|---|---|---|
| `openspec/changes/_draft/<topic>/design.md` | Exploration scratchpad | Deleted by propose; gitignored |
| `openspec/changes/<name>/design.md` | Promoted design | Lives until archive |
| `docs/lessons/YYYY-MM-DD-<name>.md` | Per-archive lessons | Created at archive time |
| `openspec/schemas/openspec-superpowers/` | Project-local schema | Created during implementation |
| `openspec/config.yaml` | Project context only (no rules) | `rules:` block emptied |
| `CLAUDE.md` | Project-wide architectural facts + general coding philosophy | Workflow rules removed |

### New schema: `openspec-superpowers`

Forked from `spec-driven`, located at `openspec/schemas/openspec-superpowers/`.

**Dependency graph:**

```
design   (requires: [])
proposal (requires: [design])
specs    (requires: [proposal])
tasks    (requires: [design, specs])
apply    (requires: [tasks])
```

**Schema content (full):**

```yaml
name: openspec-superpowers
version: 1
description: |
  OpenSpec + Superpowers workflow.
  design (from /opsx:explore) → proposal → specs → tasks → apply
artifacts:
  - id: design
    generates: design.md
    description: Technical design document, produced during exploration
    template: design.md
    instruction: |
      Create the design document that explains HOW to implement the change.

      Provenance:
      - This artifact is produced by /opsx:explore in
        openspec/changes/_draft/<topic>/design.md (uncommitted; _draft/ is
        gitignored).
      - /opsx:propose moves it to openspec/changes/<name>/design.md and
        deletes the _draft/<topic>/ directory.
      - superpowers:brainstorming is invoked as a REVIEWER (not creator)
        during /opsx:explore — its findings are folded back into design.md
        before propose runs.
      - If the change has UI surface, Visual Companion is offered during
        /opsx:explore and the selected mockup/wireframe is recorded in the
        UI section.

      Sections:
      - **Context**: Background, current state, constraints, stakeholders.
      - **Goals / Non-Goals**: What this design achieves and explicitly
        excludes.
      - **Approach**: High-level architecture and component breakdown.
      - **Decisions**: Key technical choices with rationale (why X over Y?).
        MUST include alternatives considered for each decision.
      - **Risks / Trade-offs**: Known limitations. Format: [Risk] → Mitigation.
      - **Migration Plan**: Steps to deploy, rollback strategy (if applicable).
      - **UI** (only if the change touches UI): selected mockup/wireframe
        with rationale; reference any Visual Companion artifacts.
      - **Open Questions**: Outstanding decisions or unknowns to resolve.

      Focus on architecture and approach, not line-by-line implementation.
      Good design docs explain the "why" behind technical decisions.
    requires: []

  - id: proposal
    generates: proposal.md
    description: Proposal explaining WHY this change exists and its scope
    template: proposal.md
    instruction: |
      Create the proposal document that establishes WHY this change is needed,
      reading design.md as the primary input.

      Sections:
      - **Why**: 1-2 sentences on the problem or opportunity. What does this
        solve? Why now? Anchor this in the Context/Goals from design.md.
      - **What Changes**: Bullet list of changes. Be specific about new
        capabilities, modifications, or removals. Mark breaking changes with
        **BREAKING**. Derive from the Approach + Decisions sections of
        design.md.
      - **Capabilities**: Identify which specs will be created or modified:
        - **New Capabilities**: List capabilities being introduced. Each
          becomes a new specs/<name>/spec.md. Use kebab-case names.
        - **Modified Capabilities**: List existing capabilities whose
          REQUIREMENTS are changing. Check openspec/specs/ for existing
          names. Leave empty if no requirement changes.
      - **Non-Goals (Out of Scope)**: REQUIRED. What this change explicitly
        will not do. Mirror or refine design.md's Non-Goals.
      - **Impact**: Affected code, APIs, dependencies, or systems.

      IMPORTANT: The Capabilities section creates the contract between
      proposal and specs. Research existing specs before filling it in.
      Each capability listed will need a corresponding spec file.

      Keep it concise (1-2 pages). Focus on the WHY, not the HOW — HOW lives
      in design.md.
    requires:
      - design

  - id: specs
    generates: "specs/**/*.md"
    description: Detailed capability specifications
    template: spec.md
    instruction: |
      Create specification files that define WHAT the system should do.

      Create one spec file per capability listed in the proposal's Capabilities
      section.
      - New capabilities: use the exact kebab-case name from the proposal
        (specs/<capability>/spec.md).
      - Modified capabilities: use the existing spec folder name from
        openspec/specs/<capability>/ when creating the delta spec at
        specs/<capability>/spec.md.

      Delta operations (use ## headers):
      - **ADDED Requirements**: New capabilities
      - **MODIFIED Requirements**: Changed behavior — MUST include full
        updated content (not just the diff)
      - **REMOVED Requirements**: Deprecated features — MUST include
        **Reason** and **Migration**
      - **RENAMED Requirements**: Name changes only — use FROM:/TO: format

      Format:
      - Each requirement: `### Requirement: <name>` followed by description
      - Use SHALL/MUST for normative requirements
      - Each scenario: `#### Scenario: <name>` with WHEN/THEN format
      - **CRITICAL**: Scenarios MUST use exactly 4 hashtags (`####`). Using 3
        or bullets will fail silently.
      - Every requirement MUST have at least one scenario.

      Specs should be testable — each scenario is a potential test case.
    requires:
      - proposal

  - id: tasks
    generates: tasks.md
    description: Implementation checklist with trackable tasks
    template: tasks.md
    instruction: |
      Create the task list that breaks down the implementation work, reading
      design.md (HOW) and specs/ (WHAT) as primary inputs. proposal.md is NOT
      a direct input — it is for human readers.

      **IMPORTANT: Follow the template exactly.** The apply phase parses
      checkbox format to track progress. Tasks not using `- [ ]` won't be
      tracked.

      Structural rules:
      - Group tasks under `## N` numbered headings.
      - Each task: `- [ ] N.Y Task description`.
      - For NEW behavior: precede every implementation task with a RED test
        task. Pattern:
          - [ ] N.X RED   — write failing test for <behavior>
          - [ ] N.X+1 GREEN — minimal impl to pass the test
      - For bug fixes: precede the fix with a regression test (RED) then the
        fix (GREEN).
      - Within a `## N` group, when 2+ task units touch disjoint files with
        no read/write dependency, append ` [parallel]` to each independent
        unit's first task AND insert as N.0:
          - [ ] N.0 Invoke superpowers:subagent-driven-development to
                    dispatch the [parallel] units in this group; one
                    subagent owns one RED+GREEN pair (or one standalone
                    task) end-to-end.
      - Across groups, when 2+ groups are file-disjoint, prepend tasks.md
        (above `## 1`) with:
          Invoke superpowers:subagent-driven-development to dispatch groups
          <list> in parallel; one subagent per group.
      - Every `## N` group MUST end with:
          - [ ] N.Z   Run superpowers:requesting-code-review on the diff for
                       group N; address CRITICAL/HIGH findings before moving
                       on.
          - [ ] N.Z+1 Update docs/log/YYYY-MM-DD.md — commit hash, feature
                       bullets, review findings, test count, and TDD
                       evidence (paste RED failure lines for each new test).
      - The FINAL group, when UI is touched, MUST include immediately before
        N.Z:
          - [ ] M.J Write/update Playwright E2E test under e2e/ for the
                     affected flow; commit the file. Run:
                       1. ./start.sh
                       2. cd frontend && npm start
                       3. cd e2e && npx playwright test
                       4. kill $(lsof -ti :4200)
                       5. kill $(lsof -ti :8080)
      - The FINAL group MUST include:
          - [ ] M.K Run superpowers:verification-before-completion
                     (cd backend && ./mvnw test; cd frontend && npx ng test
                     --no-watch; grep for System.out.println + console.log;
                     diff review).
      - Tasks SHOULD explicitly name the superpowers skill to invoke when
        relevant.

      Reference specs for WHAT and design for HOW. Each task should be
      verifiable — you know when it's done.
    requires:
      - design
      - specs

apply:
  requires: [tasks]
  tracks: tasks.md
  instruction: |
    Read context files (design.md, specs/, tasks.md). Work through pending
    tasks in order. After each task, IMMEDIATELY update its checkbox from
    `- [ ]` to `- [x]` before moving on — never batch checkbox updates.

    TDD discipline:
    - RED: write the failing test → run it → confirm FAILURE → paste the
      key failure lines to the dev log as TDD evidence → THEN implement.
    - GREEN: write the minimal implementation to pass → run the test →
      confirm PASS → commit test + impl together.
    - Only GREEN tests stay in the committed suite. Tests representing
      planned-but-not-yet-implemented behavior MUST be tagged
      (@Disabled / it.todo / xit) — never leave an untagged failing test.
    - Before starting each new task group, run the full test suite to
      confirm a green baseline.

    Pause if:
    - A task is unclear → ask for clarification before guessing.
    - Implementation reveals a design issue → suggest updating design.md /
      specs / tasks.md rather than working around it.
    - A blocker is encountered → report and wait.

    [parallel] tasks: when a group has N.0 referencing
    superpowers:subagent-driven-development, dispatch one subagent per
    [parallel] unit. The coordinator updates every checkbox the subagent
    finished BEFORE dispatching the next subagent.

    Code-review checkpoint (N.Z): at the end of every group, invoke
    superpowers:requesting-code-review on the diff. Address CRITICAL/HIGH
    findings before moving to the next group.

    Dev log update (N.Z+1): after the code-review checkpoint, update
    docs/log/YYYY-MM-DD.md with commit hash, feature bullets, review
    findings, test count, and TDD evidence.
```

### Command file changes

#### `.claude/commands/opsx/explore.md`

- Update the "Don't implement" guardrail to explicitly allow writing `design.md` to `openspec/changes/_draft/<topic>/`.
- Add a structured "Output produces a design draft" section:
  1. Ask user for a topic slug (kebab-case, vague is fine).
  2. Write `openspec/changes/_draft/<topic>/design.md` using the schema's design template.
  3. Invoke `Skill superpowers:brainstorming` with a review-mode prompt: *"Review the existing design.md at `<path>`. Do not start a new design. Run the spec self-review checklist (placeholder scan, internal consistency, scope, ambiguity) and surface findings."*
  4. Apply findings to `design.md`.
  5. If `design.md` has UI sections, offer Visual Companion; save selected mockup choice into the UI section.
  6. Tell user: *"Draft ready at `<path>`. When you're ready, run `/opsx:propose`."*
- Note that `_draft/` is gitignored; no commit happens in explore.

#### `.claude/commands/opsx/propose.md`

Rewrite to be draft-driven:

1. Look for `openspec/changes/_draft/*/design.md`. If multiple drafts exist, use `AskUserQuestion` to pick. If none, prompt user with three options:
   - (1) Run `/opsx:explore` first
   - (2) Brainstorm in-line now (current fallback)
   - (3) Skip and describe directly
2. Ask for final kebab-case `<name>` (default: derived from topic slug).
3. Run `openspec new change <name>`.
4. `mv openspec/changes/_draft/<topic>/design.md openspec/changes/<name>/design.md` and `rmdir openspec/changes/_draft/<topic>/`.
5. **STOP and confirm** before generating remaining artifacts (existing rule from CLAUDE.md feedback memory).
6. Loop: for each ready artifact (proposal → specs → tasks), call `openspec instructions <id>` and write the artifact per the returned instruction. The schema's `instruction:` carries all authoring rules.

Remove the auto-brainstorm-first step (brainstorming now in explore).

#### `.claude/commands/opsx/apply.md`

- Keep existing flow (load `tasks.md`, work tasks, pause on blockers).
- Add a one-line note that runtime TDD/review/checkpoint rules come from the schema's `apply.instruction` (returned by `openspec instructions apply`), so the command relies on those rather than duplicating them.

#### `.claude/commands/opsx/archive.md`

Keep existing Steps 1-6 (selection, artifact/task completion checks, spec sync, move to archive). Add:

- **Step 7: Generate lessons-learned file.**
  1. Read `openspec/changes/<name>/` artifacts (proposal, design, tasks).
  2. Read most recent `docs/log/*.md` entries that reference this change.
  3. Draft a bulleted lessons list focused on: scope drift between proposal and reality, recurring code-review findings, TDD gaps (untagged failing tests, missing RED evidence), surprises future similar work should anticipate.
  4. Show draft to user; accept edits; get approval.
  5. Write to `docs/lessons/YYYY-MM-DD-<name>.md` (create `docs/lessons/` if missing).
  6. If `CLAUDE.md` doesn't already have a `## Lessons Learned` section, add a one-line pointer to `docs/lessons/` (one-time).
- **Step 8: README update prompt.** Ask *"Update README.md based on what shipped? (y/n)"*. Only if yes, propose specific README edits and get user approval before writing.

#### `.claude/commands/opsx/new.md`, `continue.md`, `ff.md`

Unchanged. They delegate artifact ordering to `openspec status` and `openspec instructions`, so they automatically pick up the new schema's design-first ordering with zero code changes. Their "manual control" semantics still hold.

### `openspec/config.yaml`

- Set `schema: openspec-superpowers`.
- Keep the `context:` block with project tech stack info.
- Update the "Superpowers integration" paragraph in `context:` to reflect the new flow (brainstorming in explore, lessons in archive).
- **Remove the `rules:` key entirely** — not left empty, but deleted. All artifact-content rules now live in the schema's `instruction:` fields. Single source of truth.

### `.gitignore`

Add one line: `openspec/changes/_draft/`.

### `CLAUDE.md`

Slim to project-wide architecture + general philosophy only. Specific edits:

- **DELETE** the four-step "/opsx:propose — required sequence" and "Brainstorming terminal state" callout.
- **DELETE** "/opsx:apply — required skills (in order)" — content lives in schema `apply.instruction`.
- **DELETE** "tasks.md — required structure per group" — content lives in schema `tasks.instruction`.
- **DELETE** "Coding Guidelines § 5. Checkbox Discipline" — content lives in schema `apply.instruction`.
- **DELETE** the `- [ ] N.X RED / N.X+1 GREEN` code block under TDD Discipline (the philosophy paragraphs around it stay).
- **DELETE** Dev Log Practice's "Every task group MUST include a log update step" rule (lives in schema `tasks.instruction`). Keep the file path, log entry template, and the To Do section rule.
- **REPLACE** the "OpenSpec Workflow" section with a short overview pointing to `.claude/commands/opsx/*.md`.
- **ADD** one line: *"Lessons from archived changes live in `docs/lessons/` — one file per archive, named `YYYY-MM-DD-<change-name>.md`."*

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| User runs `openspec instructions` directly and expects rules in `config.yaml.rules` to be injected | Rules now live in the schema's `instruction:` blocks; `openspec instructions` already combines schema + config, so rules continue to be injected automatically. No user-facing change. |
| `_draft/` ignored but user wonders why `git status` doesn't show it | `/opsx:explore` output tells the user the draft is gitignored and prints its path. |
| Multiple drafts accumulate in `_draft/` | `/opsx:propose` lists them with `AskUserQuestion`. Stale drafts can be removed manually with `rm -rf openspec/changes/_draft/<topic>/`. |
| User skips explore and goes straight to propose | Cold-start prompt covers it (three options). |
| Lessons-learned drift across archives | Per-change dated files are self-contained; no cross-file consistency burden. |
| Schema migration: existing in-flight changes use the old `spec-driven` ordering | The `.openspec.yaml` inside each change directory pins its schema. Existing changes keep using `spec-driven`. Only new changes use `openspec-superpowers`. No retroactive migration needed. |
| `/opsx:new`, `/opsx:continue`, `/opsx:ff` written assuming proposal-first prose | They delegate to `openspec status` + `openspec instructions`, so behavior follows the new schema. Their docstrings may read slightly stale but function is correct. |

## Acceptance Criteria

- `/opsx:explore <topic>` produces `openspec/changes/_draft/<topic>/design.md`, invokes brainstorming as reviewer, optionally runs Visual Companion, leaves nothing committed.
- `_draft/` does not appear in `git status` (gitignored).
- `/opsx:propose` with an existing draft promotes it, removes `_draft/<topic>/`, and generates `proposal.md`, `specs/`, `tasks.md` without re-invoking brainstorming.
- `/opsx:propose` with no draft prompts the three-option fallback.
- `/opsx:apply` enforces TDD/review/checkpoint rules without reading `config.yaml.rules.*` (which is empty).
- `/opsx:archive` produces `docs/lessons/YYYY-MM-DD-<name>.md` from the change's artifacts and dev log, after user approval, and prompts for README updates.
- `openspec/schemas/openspec-superpowers/schema.yaml` exists and validates.
- `openspec/config.yaml` has `schema: openspec-superpowers`; the `rules:` key is removed (not present, not empty).
- `CLAUDE.md` is slimmed per the audit; only project-wide facts + general philosophy + dev log template remain.
- Each existing rule appears in exactly ONE source of truth.

## Open Questions

None at design time. The following were considered and resolved during brainstorming:

- **Draft directory location** — `openspec/changes/_draft/<topic>/` (under `openspec/changes/`; `_` prefix; gitignored).
- **Brainstorm review mechanism** — explicit `Skill superpowers:brainstorming` invocation in review mode.
- **Propose cold-start** — runtime prompt with three options (refuse / brainstorm in-line / describe directly).
- **Schema name** — `openspec-superpowers`.
- **Schema dependency graph** — design (entry) → proposal → specs → tasks; tasks requires `[design, specs]` only.
- **Lessons format** — per-change dated file under `docs/lessons/`.
- **Lessons authorship** — Claude drafts from artifacts + dev log, user reviews and approves.
- **Rule duplication** — eliminated. Each rule lives in exactly one of: schema `instruction:`, command md, or `CLAUDE.md`.
- **Legacy commands** (`new.md`, `continue.md`, `ff.md`) — left as-is; delegate to schema via CLI.
