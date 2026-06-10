# OPSX + Superpowers Workflow Formalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the four-stage OPSX + Superpowers workflow (Explore → Propose → Apply → Archive) per spec `docs/superpowers/specs/2026-05-11-opsx-workflow-formalization-design.md` (commit `bb7ad67`).

**Architecture:** A project-local OpenSpec schema (`openspec-superpowers`) carries all artifact-content rules in its `instruction:` blocks (single source of truth). Command files in `.claude/commands/opsx/` carry orchestration (skill invocations, user dialog, file mechanics). `openspec/config.yaml.rules.*` is removed. `CLAUDE.md` is slimmed to project-wide facts. A new `_draft/` area under `openspec/changes/` (gitignored) hosts explore-stage scratch.

**Tech Stack:** OpenSpec CLI (`@fission-ai/openspec`), Claude Code slash commands (markdown), Anthropic Superpowers skills, YAML/Markdown only — no application code touched.

**Verification approach:** Since this is a configuration/orchestration refactor, "tests" are CLI assertions (`openspec schema validate`, `openspec status`, `openspec instructions`) and content-presence greps. Each task runs the verification command BEFORE the change to capture baseline, makes the change, then re-runs to confirm the expected new state.

**Commit strategy:** One commit per task. Each commit represents a self-contained, working unit. Task ordering reflects dependencies (schema before config; config before commands that depend on schema).

---

## Task 1: Fork and customize the `openspec-superpowers` schema

**Files:**
- Create: `openspec/schemas/openspec-superpowers/schema.yaml`
- Create: `openspec/schemas/openspec-superpowers/templates/` (copied from default via `openspec schema fork`)

- [x] **Step 1: Confirm baseline — only `spec-driven` schema exists**

Run: `openspec schemas --json`
Expected output (one schema, package source):
```json
[
  {
    "name": "spec-driven",
    "description": "Default OpenSpec workflow - proposal → specs → design → tasks",
    "artifacts": ["proposal", "specs", "design", "tasks"],
    "source": "package"
  }
]
```

- [x] **Step 2: Fork the default schema into a project-local copy**

Run: `cd /Users/gwang/Develop/new_approach && openspec schema fork spec-driven openspec-superpowers`

Expected: command creates `openspec/schemas/openspec-superpowers/` with `schema.yaml` and `templates/` subdirectory.

Verify: `ls openspec/schemas/openspec-superpowers/`
Expected output:
```
schema.yaml
templates
```

- [x] **Step 3: Confirm the fork was registered**

Run: `openspec schemas --json`
Expected: two schemas now listed; the new one has `"name": "openspec-superpowers"` with `"source": "project"`.

- [x] **Step 4: Replace `openspec/schemas/openspec-superpowers/schema.yaml` with the customized content**

Write the file with EXACTLY the following content (overwriting the forked copy):

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

      Create one spec file per capability listed in the proposal's
      Capabilities section.
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
      - **CRITICAL**: Scenarios MUST use exactly 4 hashtags (`####`). Using
        3 or bullets will fail silently.
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

- [x] **Step 5: Validate the schema**

Run: `openspec schema validate openspec-superpowers`
Expected output: `✓ Schema 'openspec-superpowers' is valid`

If validation fails, read the error, fix the YAML, re-run. Common issues: missing required fields, invalid `requires:` references, bad template paths.

- [x] **Step 6: Confirm schemas listing shows both**

Run: `openspec schemas --json`
Expected: TWO entries — `spec-driven` (package source) AND `openspec-superpowers` (project source) with artifacts `["design", "proposal", "specs", "tasks"]`.

- [x] **Step 7: Commit**

```bash
git add openspec/schemas/openspec-superpowers/
git commit -m "$(cat <<'EOF'
feat(openspec): add project-local openspec-superpowers schema

- Forked from spec-driven and inverted dependency order to
  design-first: design → proposal → specs → tasks → apply
- Embeds artifact-content rules in each artifact's instruction:
  block (TDD pattern, parallel dispatch, N.Z review, N.Z+1 log,
  M.J E2E, M.K verification, checkbox discipline)
- Apply-time TDD/checkpoint rules consolidated in apply.instruction

Per spec docs/superpowers/specs/2026-05-11-opsx-workflow-formalization-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Update `openspec/config.yaml`

**Files:**
- Modify: `openspec/config.yaml`

- [x] **Step 1: Baseline — confirm current schema is `spec-driven` and `rules:` block exists**

Run: `grep -E '^(schema|rules):' openspec/config.yaml`
Expected output:
```
schema: spec-driven
rules:
```

- [x] **Step 2: Replace the entire file content with the new version**

Overwrite `openspec/config.yaml` with EXACTLY:

```yaml
schema: openspec-superpowers

# Project context — injected into every artifact's instruction prompt.
context: |
  Tech stack: Spring Boot 3.5 (Java 21) backend + Angular 21 frontend,
  PostgreSQL database, Google OAuth2 authentication via Spring Security.

  Backend structure (package root: com.gwhaitech.accountingfirm):
    - Layered architecture: Controller → Service → Repository.
    - Spring Data JPA repositories; schema managed by Flyway migrations
      under src/main/resources/db/migration/.
    - Config: application.yml (defaults), application-dev.yml (local),
      application-prod.yml (prod). Secrets via env vars
      (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SPRING_DATASOURCE_*).
    - REST controllers annotated @RestController under the .web package;
      DTOs in .dto; domain entities in .domain.

  Backend tests: JUnit 5 + Spring Boot Test. Use @WebMvcTest for
  controller slices, @DataJpaTest for repository slices, @SpringBootTest
  for integration tests. Tests mirror src/main/java layout under
  src/test/java. Run with `cd backend && ./mvnw test` (all) or
  `./mvnw test -Dtest=ClassName` (single class).

  Frontend structure (Angular 21, standalone components):
    - Feature-based lazy-loaded routing under src/app/.
    - HTTP services in src/app/core/services/; auth state via AuthService;
      HTTP interceptor attaches session credentials to API requests.
    - Backend base URL configured in environment.ts; dev server proxies
      /api/** to localhost:8080.
    - Component filenames use kebab-case (e.g., invoice-list.component.ts).

  Frontend tests: Jasmine + Angular TestBed. Run with
  `cd frontend && npm test` (watch) or
  `npx ng test --no-watch` (CI). Single file:
  `npx ng test --include='**/my.component.spec.ts'`.

  E2E tests: Playwright test suite under `e2e/` at the project root.
  Run with `cd e2e && npx playwright test` (all) or
  `npx playwright test --grep "<test name>"` (single test).
  Tests require the backend (`./start.sh`) and frontend (`cd frontend && npm start`)
  to be running before execution. E2E tests cover the full user flow for any
  UI change introduced — each feature or bug fix that touches the UI surface
  must have a corresponding Playwright test in `e2e/`.

  Conventions:
    - Database changes MUST be a new Flyway migration file; never edit
      existing migrations.
    - Validate inputs at REST boundaries (Bean Validation / @Valid);
      never trust client-supplied IDs beyond what Spring Security permits.
    - Angular components should be standalone; use signals for local state
      where Angular 21 supports it.
    - Lint frontend with `cd frontend && npm run lint`.

  OpenSpec + Superpowers workflow:
    - design.md is produced by /opsx:explore in
      openspec/changes/_draft/<topic>/ (uncommitted; _draft/ is gitignored).
    - superpowers:brainstorming is invoked during /opsx:explore as a
      REVIEWER of the design.md, not its creator.
    - If the change has UI surface, Visual Companion is offered during
      /opsx:explore and the selected design is recorded in design.md's
      UI section.
    - /opsx:propose promotes the draft to openspec/changes/<name>/design.md,
      then generates proposal.md, specs/, tasks.md. proposal.md is for
      human readers (Why / Scope); tasks generation reads design + specs
      only.
    - /opsx:apply enforces TDD discipline and review checkpoints per the
      schema's apply.instruction (returned by `openspec instructions apply`).
    - /opsx:archive moves the change to archive/, syncs delta specs, drafts
      a per-archive lessons file at docs/lessons/YYYY-MM-DD-<name>.md
      (user-reviewed before write), and optionally updates README.md on
      explicit user opt-in.
```

Note the explicit absence of any `rules:` key — single source of truth is the schema.

- [x] **Step 3: Verify the change**

Run: `grep -E '^(schema|rules):' openspec/config.yaml`
Expected output (one line only):
```
schema: openspec-superpowers
```

Run: `grep -c '^rules:' openspec/config.yaml`
Expected output: `0`

Run: `openspec schemas --json | head -20`
Expected: still lists both schemas — config change shouldn't break CLI.

- [x] **Step 4: Smoke-test that `openspec instructions` works against the new schema (no active change yet, so use a transient one)**

Run:
```bash
openspec new change __smoke_test__ && \
openspec instructions design --change __smoke_test__ --json | head -30
```

Expected: JSON output where `instruction:` contains the new design.md guidance ("Create the design document that explains HOW...", "Provenance:", etc.).

Cleanup: `rm -rf openspec/changes/__smoke_test__`

- [x] **Step 5: Commit**

```bash
git add openspec/config.yaml
git commit -m "$(cat <<'EOF'
chore(openspec): switch to openspec-superpowers schema, drop rules block

- schema: spec-driven → openspec-superpowers
- Rewrite the OpenSpec + Superpowers integration paragraph in
  context: to reflect the new explore→propose→apply→archive flow
- Remove the rules: block entirely (15 bullets across proposal,
  design, tasks) — all rule content now lives in the schema's
  instruction: blocks (single source of truth)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add `openspec/changes/_draft/` to `.gitignore`

**Files:**
- Modify: `.gitignore`

- [x] **Step 1: Baseline — confirm `_draft/` is not already ignored**

Run: `grep -n '_draft' .gitignore`
Expected output: (nothing — no match)

- [x] **Step 2: Append the ignore rule**

Add the following lines to the bottom of `.gitignore`:

```

# OpenSpec exploration drafts (produced by /opsx:explore, promoted by /opsx:propose)
openspec/changes/_draft/
```

(Leading blank line for separation from the previous block.)

- [x] **Step 3: Verify**

Run: `tail -5 .gitignore`
Expected to end with:
```

# OpenSpec exploration drafts (produced by /opsx:explore, promoted by /opsx:propose)
openspec/changes/_draft/
```

Run: `mkdir -p openspec/changes/_draft/_test && touch openspec/changes/_draft/_test/design.md && git check-ignore -v openspec/changes/_draft/_test/design.md; rm -rf openspec/changes/_draft/_test`
Expected: `.gitignore:<line>:openspec/changes/_draft/    openspec/changes/_draft/_test/design.md`

- [x] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "$(cat <<'EOF'
chore: gitignore openspec/changes/_draft/

OPSX exploration scratchpad — /opsx:explore writes design.md
drafts here, /opsx:propose promotes them into the real change
directory. The draft itself should not be tracked.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Rewrite `.claude/commands/opsx/explore.md`

**Files:**
- Modify: `.claude/commands/opsx/explore.md`

- [x] **Step 1: Baseline — confirm current state**

Run: `grep -E '^(##|###) ' .claude/commands/opsx/explore.md`
Expected to include sections like "## The Stance", "## What You Might Do", "## OpenSpec Awareness", "## Guardrails".

- [x] **Step 2: Replace the file with the new content**

Overwrite `.claude/commands/opsx/explore.md` with EXACTLY:

```markdown
---
name: "OPSX: Explore"
description: "Enter explore mode - think through ideas, investigate problems, clarify requirements, and produce a draft design.md"
category: Workflow
tags: [workflow, explore, experimental, thinking]
---

Enter explore mode. Think deeply. Visualize freely. Follow the conversation wherever it goes. When exploration converges, write a draft `design.md` to `openspec/changes/_draft/<topic>/`, then invoke `superpowers:brainstorming` as a REVIEWER to surface gaps before the design crystallizes.

**IMPORTANT: Explore mode is for thinking AND producing the design draft, not for implementing application code.** You MAY:
- Read files, search code, investigate the codebase.
- Write `openspec/changes/_draft/<topic>/design.md` and iterate on it.
- Invoke `superpowers:brainstorming` to review the draft.
- Offer Visual Companion when the change has UI surface and record the chosen design.

You may NOT write application code or modify production files. If the user asks to implement, remind them to run `/opsx:propose` first.

**Input**: The argument after `/opsx:explore` is whatever the user wants to think about. Could be:
- A vague idea: "real-time collaboration"
- A specific problem: "the auth system is getting unwieldy"
- A change name: "add-dark-mode" (to explore in context of that change)
- A comparison: "postgres vs sqlite for this"
- Nothing (just enter explore mode)

---

## The Stance

- **Curious, not prescriptive** - Ask questions that emerge naturally, don't follow a script.
- **Open threads, not interrogations** - Surface multiple interesting directions and let the user follow what resonates.
- **Visual** - Use ASCII diagrams liberally when they'd help clarify thinking.
- **Adaptive** - Follow interesting threads, pivot when new information emerges.
- **Patient** - Don't rush to conclusions, let the shape of the problem emerge.
- **Grounded** - Explore the actual codebase when relevant, don't just theorize.

---

## What You Might Do

Depending on what the user brings, you might:

**Explore the problem space** — ask clarifying questions, challenge assumptions, reframe, find analogies.

**Investigate the codebase** — map architecture, find integration points, identify patterns, surface hidden complexity.

**Compare options** — brainstorm approaches, build comparison tables, sketch tradeoffs, recommend a path (if asked).

**Visualize** — ASCII diagrams for system flows, state machines, data flows, dependency graphs, comparison tables.

**Surface risks and unknowns** — identify what could go wrong, find gaps, suggest spikes.

---

## Producing the design draft

When exploration converges and the shape of the problem is clear, transition into draft-production mode:

1. **Ask for a topic slug.** Use the AskUserQuestion tool (open-ended):
   > "What's a short kebab-case slug for this topic? (e.g., `realtime-collab`, `auth-cleanup`) — vague is fine, the final change name is decided at propose time."

2. **Write the draft `design.md`** at `openspec/changes/_draft/<topic>/design.md`. Use this template:

   ```markdown
   # Design: <Topic Title>

   **Date:** YYYY-MM-DD
   **Status:** Draft — produced via /opsx:explore

   ## Context

   <Background, current state, constraints, stakeholders.>

   ## Goals / Non-Goals

   **Goals:**
   - <Bullet>

   **Non-Goals:**
   - <Bullet>

   ## Approach

   <High-level architecture and component breakdown.>

   ## Decisions

   ### Decision: <name>
   **Choice:** <chosen approach>
   **Alternatives considered:** <list>
   **Rationale:** <why X over Y>

   ## Risks / Trade-offs

   - [Risk] → Mitigation

   ## Migration Plan

   <Steps to deploy, rollback strategy. Omit section if not applicable.>

   ## UI

   <Selected mockup/wireframe with rationale. Omit section if no UI surface.>

   ## Open Questions

   - <Bullet>
   ```

3. **Invoke `superpowers:brainstorming` as REVIEWER.** Use the Skill tool with this prompt:
   > "Review the existing design.md at `openspec/changes/_draft/<topic>/design.md`. DO NOT start a new design. Run the spec self-review checklist (placeholder scan, internal consistency, scope, ambiguity check) and return findings as a structured list. The design was produced via /opsx:explore and will be promoted into a real change by /opsx:propose; your role is to surface issues so the user can refine it."

4. **Apply findings** to `design.md`. Iterate until the user is satisfied.

5. **If the change has UI surface**, offer Visual Companion:
   > "This change has UI. Want me to open Visual Companion to design the screens? Some of what we're working on might be easier to compare visually. (Requires opening a local URL.)"

   If the user accepts, run Visual Companion. Capture the selected mockup/wireframe (as ASCII, description, or reference to a saved image) into the UI section of `design.md`.

6. **Notify the user**:
   > "Draft ready at `openspec/changes/_draft/<topic>/design.md`. The draft is gitignored — it lives outside source control until /opsx:propose promotes it. When you're ready to formalize this as a change, run `/opsx:propose`."

---

## OpenSpec Awareness

If the user mentions an EXISTING change (already in `openspec/changes/<name>/`, not in `_draft/`), read its artifacts for context (`proposal.md`, `design.md`, `specs/`, `tasks.md`). Reference them naturally in conversation. If insights warrant updates, offer:

| Insight Type               | Where to Capture               |
|----------------------------|--------------------------------|
| New requirement discovered | `specs/<capability>/spec.md`   |
| Requirement changed        | `specs/<capability>/spec.md`   |
| Design decision made       | `design.md`                    |
| Scope changed              | `proposal.md`                  |
| New work identified        | `tasks.md`                     |
| Assumption invalidated     | Relevant artifact              |

Offer and move on. Don't pressure. Don't auto-capture.

---

## Guardrails

- **Don't implement application code** — explore is for thinking and producing the design draft. Application code happens during /opsx:apply.
- **Don't commit `_draft/`** — it's gitignored.
- **Don't run `openspec new change`** during explore — that's /opsx:propose's job. Explore keeps the design in `_draft/` so the kebab-case name decision is deferred.
- **Don't fake understanding** — if something is unclear, dig deeper.
- **Don't rush** — discovery is thinking time, not task time.
- **Do visualize** — a good diagram is worth many paragraphs.
- **Do explore the codebase** — ground discussions in reality.
- **Do question assumptions** — including the user's and your own.
```

- [x] **Step 3: Verify content presence**

Run: `grep -c 'openspec/changes/_draft' .claude/commands/opsx/explore.md`
Expected: at least `4` (the path is referenced throughout).

Run: `grep -c 'superpowers:brainstorming' .claude/commands/opsx/explore.md`
Expected: at least `2` (mentioned in description and in the review-mode invocation step).

Run: `grep -c 'Visual Companion' .claude/commands/opsx/explore.md`
Expected: at least `2`.

- [x] **Step 4: Commit**

```bash
git add .claude/commands/opsx/explore.md
git commit -m "$(cat <<'EOF'
feat(opsx): rewrite /opsx:explore to produce draft design.md

- Explore now writes openspec/changes/_draft/<topic>/design.md
  using the spec design template (Context, Goals, Approach,
  Decisions, Risks, UI, Open Questions)
- Invokes superpowers:brainstorming as REVIEWER (not creator)
  to surface gaps before propose runs
- Offers Visual Companion when the change has UI surface and
  records the chosen design into design.md's UI section
- Draft is gitignored (per openspec/changes/_draft/ .gitignore
  rule); /opsx:propose promotes it into the real change dir

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Rewrite `.claude/commands/opsx/propose.md`

**Files:**
- Modify: `.claude/commands/opsx/propose.md`

- [x] **Step 1: Baseline — confirm current state references auto-brainstorming**

Run: `grep -i 'brainstorm' .claude/commands/opsx/propose.md`
Expected: existing references show brainstorming being triggered inside propose.

- [x] **Step 2: Replace the file with the new content**

Overwrite `.claude/commands/opsx/propose.md` with EXACTLY:

```markdown
---
name: "OPSX: Propose"
description: Promote an explore-stage draft into a real OpenSpec change and generate all artifacts needed for implementation
category: Workflow
tags: [workflow, artifacts, experimental]
---

Promote a `_draft/` design.md into a real OpenSpec change and generate the remaining artifacts.

**Inputs:**
- A draft at `openspec/changes/_draft/<topic>/design.md` produced via `/opsx:explore` (the expected path).
- OPTIONAL: a final kebab-case `<name>` argument after `/opsx:propose`. If omitted, the command asks.

**Outputs:**
- `openspec/changes/<name>/design.md` (moved from `_draft/<topic>/`)
- `openspec/changes/<name>/proposal.md`
- `openspec/changes/<name>/specs/<capability>/spec.md` per capability listed in proposal
- `openspec/changes/<name>/tasks.md`

When ready to implement, run `/opsx:apply`.

---

## Steps

### 1. Locate the draft

Run: `ls openspec/changes/_draft/`

**If exactly one draft directory exists**, use it. Announce: "Using draft `<topic>`."

**If multiple drafts exist**, use the AskUserQuestion tool to let the user pick from the list (one option per draft topic).

**If NO drafts exist**, use the AskUserQuestion tool with these three options:
- (Recommended) "Run `/opsx:explore` first" — STOP and tell the user to run explore.
- "Brainstorm in-line now" — fall back to the legacy flow: ask for `<name>` and a description, run `openspec new change <name>`, invoke `superpowers:brainstorming` as CREATOR to write `design.md` directly inside the new change dir, then continue with step 5 below (skip steps 2-4).
- "Skip brainstorming, I'll describe directly" — ask for `<name>` and a one-paragraph description, run `openspec new change <name>`, write a minimal `design.md` from the description into the change dir, then continue with step 5 (skip steps 2-4).

### 2. Ask for the final change name

Use the AskUserQuestion tool (open-ended, no preset options):
> "What kebab-case name should this change have? (e.g., `add-realtime-collab`) Default derived from draft topic: `<topic>`."

Accept either the suggested default or the user's chosen name. Validate that the name is kebab-case (lowercase, hyphens, no spaces/dots/underscores). If invalid, ask again.

### 3. Scaffold the change directory

Run: `openspec new change <name>`

This creates `openspec/changes/<name>/` with `.openspec.yaml` pinned to schema `openspec-superpowers`.

### 4. Promote the draft

```bash
mv openspec/changes/_draft/<topic>/design.md openspec/changes/<name>/design.md
rmdir openspec/changes/_draft/<topic>
```

Verify with `ls openspec/changes/<name>/` — should show `.openspec.yaml` and `design.md`.

### 5. STOP and confirm before generating remaining artifacts

Tell the user:
> "Draft promoted: `openspec/changes/<name>/design.md`. Ready to generate `proposal.md`, `specs/`, and `tasks.md`. Confirm to proceed?"

Wait for explicit "yes" / "go ahead" / similar. Do NOT auto-proceed.

### 6. Generate remaining artifacts in dependency order

Use the TodoWrite tool to track progress.

Run: `openspec status --change "<name>" --json`

Parse the response. For each artifact with `status: "ready"` (dependencies satisfied), in order:

a. Get instructions:
   ```bash
   openspec instructions <artifact-id> --change "<name>" --json
   ```

   The JSON includes:
   - `context`: Project background (constraints for you — do NOT include in output)
   - `rules`: Artifact-specific rules (constraints for you — do NOT include in output; in this schema, rules live inside `instruction`)
   - `template`: The structure to use for your output file
   - `instruction`: Schema-specific guidance for this artifact type
   - `outputPath`: Where to write the artifact
   - `dependencies`: Completed artifacts to read for context

b. Read any completed dependency files for context.

c. Create the artifact file using `template` as the structure and `instruction` as the authoring rules.

d. Apply `context` as background; do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into the output.

e. Show brief progress: "Created `<artifact-id>`."

f. Re-run `openspec status --change "<name>" --json`; continue with the next ready artifact until all `applyRequires` entries are `done`.

### 7. Show final status

Run: `openspec status --change "<name>"`

Summarize:
- Change name and location
- Artifacts created
- Next step: "Run `/opsx:apply` to start implementing."

---

## Guardrails

- **Always look in `_draft/` first.** If a draft exists, promote it — don't re-brainstorm.
- **Never auto-pick a name.** Always ask the user, even if a default is obvious.
- **Always STOP and confirm** before generating proposal/specs/tasks. The draft promotion is the natural pause point.
- **Always remove the empty `_draft/<topic>/` directory** after moving design.md.
- **Verify each artifact file exists** after writing before proceeding to the next.
- **If a change with the chosen name already exists**, ask the user to pick a different name.
- **`context` and `rules` from `openspec instructions` are constraints for YOU, not content for the file** — do not copy them into the artifact.
```

- [x] **Step 3: Verify content presence**

Run: `grep -c '_draft' .claude/commands/opsx/propose.md`
Expected: at least `5`.

Run: `grep -c 'STOP and confirm' .claude/commands/opsx/propose.md`
Expected: at least `1`.

Run: `grep -ci 'three options\|Recommended.*explore\|brainstorm in-line now\|skip brainstorming' .claude/commands/opsx/propose.md`
Expected: at least `3`.

- [x] **Step 4: Commit**

```bash
git add .claude/commands/opsx/propose.md
git commit -m "$(cat <<'EOF'
feat(opsx): rewrite /opsx:propose to be draft-driven

- Looks for openspec/changes/_draft/*/design.md as the input
- Three-option cold-start prompt if no draft exists:
  (1) run /opsx:explore first (recommended)
  (2) brainstorm in-line now (legacy fallback)
  (3) skip brainstorming and describe directly
- Asks for final kebab-case <name>, runs openspec new change,
  moves the draft design.md into the new change dir, removes
  the empty _draft/<topic>/
- STOPs and confirms before generating proposal/specs/tasks
- Removes auto-brainstorm step (brainstorming now happens in
  /opsx:explore as a reviewer, not a creator)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Update `.claude/commands/opsx/apply.md`

**Files:**
- Modify: `.claude/commands/opsx/apply.md`

This task is minor — apply.md keeps its current orchestration; we only add a one-line pointer that the TDD/checkpoint/checkbox rules live in the schema's `apply.instruction` (returned by `openspec instructions apply`), so the command relies on those rather than duplicating.

- [x] **Step 1: Baseline — capture current section structure**

Run: `grep -E '^(##|###|\*\*Steps\*\*) ' .claude/commands/opsx/apply.md`
Capture the output for reference.

- [x] **Step 2: Edit the file**

Use the Edit tool to make the following targeted insertion just after the `**Steps**` heading.

Find this exact block:

```
**Steps**

1. **Select the change**
```

Replace with:

```
**Authoritative rules**

This command orchestrates how to work through tasks. The actual TDD discipline, code-review checkpoints, checkbox discipline, subagent dispatch, and dev log update rules live in the schema's `apply.instruction` field and are returned automatically by `openspec instructions apply --change "<name>" --json` (see Step 3 below). Read that output before starting — it is the authoritative source for HOW each task is executed.

**Steps**

1. **Select the change**
```

- [x] **Step 3: Verify the change**

Run: `grep -A1 'Authoritative rules' .claude/commands/opsx/apply.md | head -3`
Expected:
```
**Authoritative rules**

This command orchestrates how to work through tasks. The actual TDD discipline, code-review checkpoints, checkbox discipline, subagent dispatch, and dev log update rules live in the schema's `apply.instruction` field
```

- [x] **Step 4: Commit**

```bash
git add .claude/commands/opsx/apply.md
git commit -m "$(cat <<'EOF'
docs(opsx): point /opsx:apply at schema apply.instruction

Adds an Authoritative rules note clarifying that TDD,
checkpoint, checkbox, subagent-dispatch, and dev log rules
live in the openspec-superpowers schema's apply.instruction
field and are injected via `openspec instructions apply`.
The command itself keeps doing pure orchestration.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Update `.claude/commands/opsx/archive.md`

**Files:**
- Modify: `.claude/commands/opsx/archive.md`

Add two new steps (Step 7: lessons-learned, Step 8: README prompt) and the corresponding output/guardrails.

- [x] **Step 1: Baseline — confirm current structure (6 steps + Output sections + Guardrails)**

Run: `grep -E '^(\d+\.|## |\*\*[A-Z][a-z]+ )' .claude/commands/opsx/archive.md | head -20`
Expected: shows numbered steps 1-6 and the various **Output** sections.

- [x] **Step 2: Edit the file — insert Step 7 and Step 8 before the "Output" section**

Use the Edit tool. Find this exact block (Step 6 + the start of Output):

```
6. **Display summary**

   Show archive completion summary including:
   - Change name
   - Schema that was used
   - Archive location
   - Spec sync status (synced / sync skipped / no delta specs)
   - Note about any warnings (incomplete artifacts/tasks)

**Output On Success**
```

Replace with:

```
6. **Display summary**

   Show archive completion summary including:
   - Change name
   - Schema that was used
   - Archive location
   - Spec sync status (synced / sync skipped / no delta specs)
   - Note about any warnings (incomplete artifacts/tasks)

7. **Generate lessons-learned file**

   a. **Read source material**:
      - Read `openspec/changes/archive/YYYY-MM-DD-<name>/` artifacts (proposal, design, tasks, specs).
      - Read the most recent `docs/log/*.md` entries that mention `<name>` or whose date overlaps the change's active window.

   b. **Draft a bulleted lessons list** focused on:
      - **Scope drift**: differences between proposal/design and what shipped.
      - **Recurring review findings**: themes that came up across multiple group N.Z checkpoints.
      - **TDD gaps**: untagged failing tests, missing RED evidence, baseline failures encountered.
      - **Surprises**: anything future similar work should anticipate (perf, integration friction, library quirks, schema edge cases).

   c. **Show the draft to the user** and accept edits. Use the AskUserQuestion tool with options "Looks good, write it" / "Let me edit" / "Skip lessons for this change". Do NOT auto-write.

   d. **If approved**, write to `docs/lessons/YYYY-MM-DD-<name>.md` (create `docs/lessons/` if missing). Use this template:

      ```markdown
      # Lessons: <Change Name>

      **Archived:** YYYY-MM-DD
      **Change directory:** `openspec/changes/archive/YYYY-MM-DD-<name>/`

      ## Scope vs. reality

      - <bullet>

      ## Recurring review findings

      - <bullet>

      ## TDD observations

      - <bullet>

      ## Surprises / things to anticipate next time

      - <bullet>
      ```

   e. **If `CLAUDE.md` does not already have a `## Lessons Learned` section**, add this one-line section (one-time):

      ```markdown
      ## Lessons Learned

      Lessons from archived changes live in `docs/lessons/` — one file per archive, named `YYYY-MM-DD-<change-name>.md`.
      ```

      Check first with `grep -c '^## Lessons Learned' CLAUDE.md`. Only add if zero.

8. **Prompt for README update**

   Use the AskUserQuestion tool:
   > "Update README.md based on what shipped in this change? (y/n)"

   - If "n": skip and proceed to Output.
   - If "y": read README.md, identify candidate edits that reflect the change (new feature, new env var, new run instruction, etc.), propose them to the user, accept edits, write only after explicit approval.

**Output On Success**
```

- [x] **Step 3: Update the Guardrails section**

Find this exact block:

```
**Guardrails**
- Always prompt for change selection if not provided
- Use artifact graph (openspec status --json) for completion checking
- Don't block archive on warnings - just inform and confirm
- Preserve .openspec.yaml when moving to archive (it moves with the directory)
- Show clear summary of what happened
- If sync is requested, use the Skill tool to invoke `openspec-sync-specs` (agent-driven)
- If delta specs exist, always run the sync assessment and show the combined summary before prompting
```

Replace with:

```
**Guardrails**
- Always prompt for change selection if not provided
- Use artifact graph (openspec status --json) for completion checking
- Don't block archive on warnings - just inform and confirm
- Preserve .openspec.yaml when moving to archive (it moves with the directory)
- Show clear summary of what happened
- If sync is requested, use the Skill tool to invoke `openspec-sync-specs` (agent-driven)
- If delta specs exist, always run the sync assessment and show the combined summary before prompting
- **Lessons-learned is user-reviewed, never auto-written.** Always show the draft and get approval before writing `docs/lessons/YYYY-MM-DD-<name>.md`.
- **README updates require explicit "y".** Default to "n" (no update). Even on "y", propose specific edits and get approval before writing.
```

- [x] **Step 4: Verify**

Run: `grep -c '^7\. \*\*Generate lessons-learned' .claude/commands/opsx/archive.md`
Expected: `1`

Run: `grep -c '^8\. \*\*Prompt for README' .claude/commands/opsx/archive.md`
Expected: `1`

Run: `grep -c 'docs/lessons/YYYY-MM-DD' .claude/commands/opsx/archive.md`
Expected: at least `2`

- [x] **Step 5: Commit**

```bash
git add .claude/commands/opsx/archive.md
git commit -m "$(cat <<'EOF'
feat(opsx): /opsx:archive writes per-change lessons + README prompt

- Step 7: After move-to-archive, scan artifacts + recent dev log,
  draft a lessons-learned bullet list (scope drift, recurring
  review findings, TDD gaps, surprises), show to user, write to
  docs/lessons/YYYY-MM-DD-<name>.md on approval
- Step 7e: On first archive, add a one-line ## Lessons Learned
  section to CLAUDE.md pointing at docs/lessons/
- Step 8: Prompt "Update README.md? (y/n)" — proposes specific
  edits on "y" but only writes after explicit user approval
- Guardrails reinforce: lessons never auto-written; README
  defaults to no-update

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Slim `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

Remove sections that now live elsewhere (schema instructions / command files); keep project-wide architectural facts, general philosophy, and dev-log template.

- [x] **Step 1: Baseline — capture line count**

Run: `wc -l CLAUDE.md`
Capture the result (e.g., `270 CLAUDE.md`).

- [x] **Step 2: Edit the TDD Discipline section**

Use the Edit tool. Find this exact block:

```
### TDD Discipline

Write the failing test first. **The RED phase must be verified** — run the test, confirm it fails with the expected message, then implement. Do not mark a RED task complete without running the test and seeing it fail.

```
- [ ] N.X RED  — write failing test → run test → confirm FAILURE → paste key failure lines into dev log
- [ ] N.X+1 GREEN — write minimal impl → run test → confirm PASS → commit test + impl together
```

**Only GREEN tests are committed to the codebase.**
```

Replace with:

```
### TDD Discipline

Write the failing test first. **The RED phase must be verified** — run the test, confirm it fails with the expected message, then implement. Do not mark a RED task complete without running the test and seeing it fail.

The exact RED/GREEN task pattern, parallel dispatch, code-review checkpoint, dev log update, and checkbox discipline rules live in the openspec-superpowers schema's `tasks.instruction` (for authoring tasks.md) and `apply.instruction` (for executing it). The schema is the source of truth — see `openspec/schemas/openspec-superpowers/schema.yaml`.

**Only GREEN tests are committed to the codebase.**
```

- [x] **Step 3: Delete the entire OpenSpec Workflow detailed subsections**

Use the Edit tool. Find this exact block (the full OpenSpec Workflow section starting after Skills Available):

```
## OpenSpec Workflow

Change proposals and tasks live in `openspec/`. Use `/opsx:propose` to create a new change, `/opsx:apply` to implement it, and `/opsx:archive` when done.

### `/opsx:propose` — required sequence

1. `superpowers:brainstorming` runs first (auto-triggered)
2. After brainstorming: write the design spec and commit it
3. **STOP** — ask the user to confirm before generating any artifacts
4. On confirmation: run `openspec new change`, then generate `proposal.md`, `design.md`, `tasks.md`

> **Brainstorming terminal state:** After brainstorming completes it will suggest invoking `superpowers:writing-plans` — **ignore that**. That applies to standalone brainstorming only. Continue with step 3 above.

### `/opsx:apply` — required skills (in order)

Before implementing any task, invoke:
1. `superpowers:test-driven-development` — at session start, before writing any code
2. `superpowers:subagent-driven-development` — dispatch a fresh subagent per `[parallel]` task with two-stage review (spec compliance, then code quality)
3. `superpowers:requesting-code-review` — at each task-group checkpoint (`N.Z`)

### `tasks.md` — required structure per group

**Before dispatching any subagents:** audit every `## N` group — confirm each has an N.Z (code review) and N.Z+1 (log update) task. Add them if missing.

Every `## N` group must end with:
```
- [ ] N.Z   Run superpowers:requesting-code-review on the diff for group N
- [ ] N.Z+1 Update docs/log/YYYY-MM-DD.md — commit hash, feature bullets, review findings, test count, and TDD evidence (paste RED failure lines for each new test)
```
For the final group (if UI is touched), add these two tasks immediately before `N.Z`:
```
- [ ] M.J Write/update Playwright E2E test under `e2e/` for the affected user flow; commit the file. Run:
         1. ./start.sh                          # start backend
         2. cd frontend && npm start            # start frontend
         3. cd e2e && npx playwright test       # run E2E suite
         4. kill $(lsof -ti :4200)              # stop frontend
         5. kill $(lsof -ti :8080)              # stop backend
- [ ] M.K Run superpowers:verification-before-completion (cd backend && ./mvnw test; cd frontend && npx ng test --no-watch; grep for System.out.println + console.log; diff review)
```
```

Replace with:

```
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
```

- [x] **Step 4: Delete the "5. Checkbox Discipline" subsection from Coding Guidelines**

Use the Edit tool. Find this exact block:

```
### 5. Checkbox Discipline

**Mark each task complete immediately after finishing it. Never batch updates.**

When working through `tasks.md`:
- Update `- [ ]` to `- [x]` as soon as the task is done, before moving to the next one.
- If a subagent completes work, the coordinator must update every checkbox that subagent finished before dispatching the next subagent.
- A checkbox marked `[x]` means the work is done AND verified — not just "I think it's done".

## Dev Log Practice
```

Replace with:

```
## Dev Log Practice
```

- [x] **Step 5: Slim the Dev Log Practice rule about "log update is required"**

Use the Edit tool. Find this exact block:

```
## Dev Log Practice

Every task group in `tasks.md` MUST include a log update step. When generating `tasks.md` (during `/opsx:propose`), add this task at the end of each `## N` group, after the code-review checkpoint:

```
- [ ] N.Z+1 Update docs/log/YYYY-MM-DD.md — add entry for group N with commit hash, feature bullet points, code review findings, test count, and TDD evidence (paste RED failure lines for each new test)
```

Log file path: `docs/log/YYYY-MM-DD.md` — name the file by date. If the file for that day does not exist, create it.
```

Replace with:

```
## Dev Log Practice

Dev log entries live at `docs/log/YYYY-MM-DD.md` — one file per date, created on first use. The schema (`tasks.instruction`) is what requires a log update task in every `## N` group; this section defines what each entry looks like.
```

- [x] **Step 6: Slim the "Rules" subsection at the end of Dev Log Practice**

Use the Edit tool. Find this exact block:

```
### Rules

- Log update is a required task in every group — not optional, not deferred.
- Use `- [ ]` for pending items and `- [x]` for completed items.
- Keep a **To Do** section at the end of the log, listing the next batch of work or known issues.
```

Replace with:

```
### Rules

- Use `- [ ]` for pending items and `- [x]` for completed items.
- Keep a **To Do** section at the end of the log, listing the next batch of work or known issues.
```

- [x] **Step 7: Verify the slimmed CLAUDE.md**

Run: `wc -l CLAUDE.md`
Expected: fewer lines than baseline (roughly 50 lines lighter — the deleted opsx subsections were ~30 lines, Checkbox Discipline ~10, log "required" rule + opening paragraph ~10).

Run: `grep -c 'superpowers:brainstorming runs first' CLAUDE.md`
Expected: `0` (the old propose flow is gone).

Run: `grep -c '5\. Checkbox Discipline' CLAUDE.md`
Expected: `0`.

Run: `grep -c '/opsx:explore' CLAUDE.md`
Expected: at least `1` (referenced in the new OpenSpec Workflow table).

Run: `grep -c 'docs/lessons' CLAUDE.md`
Expected: at least `0` — note: `## Lessons Learned` pointer is added by `/opsx:archive` on first run (Step 7e in archive.md), NOT by this task. CLAUDE.md after this task does not yet have that section.

- [x] **Step 8: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs(claude-md): slim to project facts; remove workflow duplicates

Workflow rules now have a single source of truth: the
openspec-superpowers schema. CLAUDE.md keeps project-wide
architecture, run commands, and general coding philosophy.

- Replace the four-step /opsx:propose sequence and apply-time
  required-skills list with a single table summarizing the four
  /opsx:* commands and pointing at the schema
- Drop the "tasks.md — required structure per group" block
  (now in schema tasks.instruction)
- Drop "Coding Guidelines § 5. Checkbox Discipline" (now in
  schema apply.instruction)
- Drop the "log update is required" rule from Dev Log Practice
  (now in schema tasks.instruction); keep the entry format and
  the To Do convention
- Trim the TDD Discipline section's task-pattern code block;
  keep the run-the-RED-first philosophy

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: End-to-end smoke test

**Files:** none modified — verification only.

This task confirms the new workflow works without committing the smoke-test artifacts. Use a throwaway change name (`__smoke_e2e__`) and remove it at the end.

- [x] **Step 1: Verify schema is active**

Run: `openspec schemas --json | grep -A2 openspec-superpowers`
Expected: shows `"source": "project"` and the new artifact ordering.

- [x] **Step 2: Create a fake draft and confirm gitignore**

```bash
mkdir -p openspec/changes/_draft/__smoke_e2e__
cat > openspec/changes/_draft/__smoke_e2e__/design.md <<'EOF'
# Design: smoke test

**Status:** Draft

## Context
End-to-end smoke test for the openspec-superpowers schema flow.

## Goals / Non-Goals
**Goals:**
- Confirm propose promotes draft.
**Non-Goals:**
- Anything real.

## Approach
Move me.

## Decisions
### Decision: minimal
**Choice:** smoke
**Alternatives considered:** none
**Rationale:** test-only

## Risks / Trade-offs
- None — temporary.

## Open Questions
- None.
EOF
```

Verify gitignored: `git check-ignore -v openspec/changes/_draft/__smoke_e2e__/design.md`
Expected: matches the `.gitignore` rule.

Verify `git status` does NOT show the draft:
Run: `git status --short`
Expected: the `_draft/` path is NOT listed.

- [x] **Step 3: Promote via CLI (simulating what /opsx:propose does)**

```bash
openspec new change __smoke_e2e__
mv openspec/changes/_draft/__smoke_e2e__/design.md openspec/changes/__smoke_e2e__/design.md
rmdir openspec/changes/_draft/__smoke_e2e__
```

Verify:
```bash
ls openspec/changes/__smoke_e2e__/
```
Expected: `.openspec.yaml` and `design.md`.

```bash
test ! -d openspec/changes/_draft/__smoke_e2e__ && echo "draft removed"
```
Expected: `draft removed`

- [x] **Step 4: Confirm status reports design as `done` and proposal as `ready`**

Run: `openspec status --change __smoke_e2e__ --json`
Expected: artifact `design` has `status: "done"`; `proposal` has `status: "ready"`; `specs` and `tasks` are `blocked` (transitively).

- [x] **Step 5: Confirm `openspec instructions proposal` returns the new instruction**

Run: `openspec instructions proposal --change __smoke_e2e__ --json | grep -c 'reading design.md as the primary input'`
Expected: `1`.

- [x] **Step 6: Confirm `openspec instructions apply` returns the TDD-discipline block**

Run: `openspec instructions apply --change __smoke_e2e__ --json | grep -c 'TDD discipline:'`
Expected: `1`.

Run: `openspec instructions apply --change __smoke_e2e__ --json | grep -c 'IMMEDIATELY update its checkbox'`
Expected: `1`.

- [x] **Step 7: Cleanup**

```bash
rm -rf openspec/changes/__smoke_e2e__
```

Verify: `ls openspec/changes/ | grep -c __smoke_e2e__` → `0`.

- [x] **Step 8: Confirm tree is clean**

Run: `git status`
Expected: working tree clean (no smoke-test residue, no unintended changes).

This task creates NO commit — it's verification only.

---

## Summary

After all 9 tasks:

- 7 commits land on `new_approach` (Tasks 1-8; Task 9 is verification-only).
- `openspec-superpowers` schema is the source of truth for artifact rules.
- `openspec/config.yaml` is roughly half its size, no `rules:` block.
- `.gitignore` excludes `_draft/`.
- All four `/opsx:*` commands reflect the new flow.
- `CLAUDE.md` is slimmed; workflow rules no longer duplicated.
- The smoke test confirms `openspec instructions` correctly surfaces the new schema's instruction blocks.

Acceptance criteria from the design spec are satisfied by Tasks 1, 2, 4, 5, 6, 7, 8 (each closes a different criterion).
