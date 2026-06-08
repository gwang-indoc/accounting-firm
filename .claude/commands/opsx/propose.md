---
name: "OPSX: Propose"
description: Create an OpenSpec change from a reviewed requirements doc; generates all artifacts
category: Workflow
tags: [workflow, artifacts, experimental]
---

Create an OpenSpec change with all artifacts. Pre-condition: a reviewed requirements doc exists at `docs/superpowers/specs/<date>-<topic>-requirements.md`.

**Input**: The argument after `/opsx:propose` is the change name (kebab-case). The same `<topic>` used in `/opsx:explore`.

---

**Steps**

### 1. Pre-flight: requirements gate

Locate the requirements doc:

```bash
ls docs/superpowers/specs/*-<topic>-requirements.md 2>/dev/null
```

If no file matches → REFUSE with:

> "No requirements doc found for `<topic>`. Run `/opsx:explore <topic>` first to produce `docs/superpowers/specs/<date>-<topic>-requirements.md`."

If found, read its frontmatter. Check `Status:` field:

- `Status: DRAFT` → REFUSE with:
  > "Requirements doc is `Status: DRAFT`. Run `/opsx:explore <topic>` Phase 3 (brainstorming review) to bring it to `Status: REVIEWED` before proposing."
- `Status: REVIEWED` → proceed.

### 2. Create the change directory

```bash
openspec new change <topic> --schema superpowers-driven
```

This scaffolds `openspec/changes/<topic>/` with `.openspec.yaml` set to `superpowers-driven`.

### 2a. Move the staged requirements doc into the change dir

`/opsx:explore` staged the requirements doc at `docs/superpowers/specs/<date>-<topic>-requirements.md`. The `requirements` artifact's `generates` path is `requirements.md` (change-relative), so move the staged file into the change dir now — before generating any artifact. This makes openspec see `requirements` as `done` and ensures the doc archives with the change.

```bash
git mv docs/superpowers/specs/<date>-<topic>-requirements.md openspec/changes/<topic>/requirements.md
```

(Use `mv` instead of `git mv` if the staged file was never committed.) After the move, `openspec status --change <topic> --json` must report `requirements` as `done`. If it does not, the move target is wrong — fix it before proceeding.

### 3. Generate artifacts in dependency order

```bash
openspec status --change <topic> --json
```

Use the `artifacts` array to walk dependency-ready artifacts. For each:

```bash
openspec instructions <artifact-id> --change <topic> --json
```

Read the returned `template`, `instruction`, `dependencies`. For each dependency listed, READ the dependency artifact file from disk before generating.

Use the **TodoWrite tool** to track artifact-generation progress.

Order: `proposal` → `specs` → `design` → `tasks`.
(`requirements` was staged in `/opsx:explore` and moved into the change dir in Step 2a; openspec sees it as `done`.)

All artifacts generate at change-relative paths (`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`), so no `{{date}}`/`{{change}}` substitution is needed.

### 3a. Fill in Contract blocks in tasks.md

After the `tasks` artifact is generated, the `### Contract` blocks contain placeholder comments. Fill them in now — the N.0 CONTRACT task in apply will copy this content to a file; the content decisions happen here.

The generated `tasks.md` uses the harness template: each group has an `N.0 CONTRACT` task (first) and an `N.E EVAL` task (last). Verify these entries appear in the generated file — if you see `N.Z Run superpowers:requesting-code-review` instead, the schema lock is pointing to the old template. Fix it before proceeding.

For each `## N` group in `openspec/changes/<topic>/tasks.md`:

**Spec field:** Read `openspec/changes/<topic>/specs/<cap>/spec.md`. Identify which SHALL statements this group's tasks implement (by reading the task descriptions). Copy those SHALL statements verbatim into the Contract's Spec field. If multiple capabilities are touched, include statements from each. If no SHALL statements map to this group (e.g., pure infrastructure task), write `N/A — infrastructure group` and note why.

**Runtime field:** Read `openspec/config.yaml` → `project.test_commands`. Choose the command most relevant to this group's tests (e.g., for a backend group: `pytest tests/<module>/`; for a frontend group: `vitest run src/<module>/`). Scope the path to the files this group touches if possible. Set expected to a plain-language description of what passing looks like (e.g., "all 4 tests pass, no import errors"). If `project.test_commands` is absent or empty in `openspec/config.yaml`, write `command: TBD` and `expected: TBD — test harness not yet configured`.

**Code field:** Read `openspec/changes/<topic>/design.md`. Extract the design decisions and risk points that apply to this group. 1–3 bullet points. Examples: "must use repository pattern, no direct DB calls in route handler", "token must be validated before any capability check".

**Threshold field:** Default `80`.

After filling all groups, pre-create the `contracts/` directory and `eval-log.md`:

```bash
mkdir -p openspec/changes/<topic>/contracts
```

Create `openspec/changes/<topic>/eval-log.md` with this header (substituting the actual topic name):

```markdown
# Eval Log — <topic>

<!-- Appended by evaluator subagent after each N.E EVAL run -->
```

### 4. Verify all artifacts

```bash
openspec status --change <topic>
```

Every artifact should be `done`. If any are not, troubleshoot the specific artifact.

### 5. Commit and handoff

```bash
git add openspec/changes/<topic>/
git commit -m "docs: propose <topic> change"
```

The `git add` includes the `requirements.md` moved in Step 2a (its deletion from the staging path is also staged by `git mv`).

Output:

> "Change `<topic>` proposed. Artifacts: requirements (moved into the change dir), proposal, specs, design, tasks. Next: `/opsx:apply <topic>`."

---

**Guardrails**

- NEVER bypass the Status: REVIEWED check. If the user insists, send them back to `/opsx:explore` Phase 3.
- NEVER write artifacts that the schema would generate via `openspec instructions`. Always go through the CLI.
- If a change with that name already exists at `openspec/changes/<topic>/`, ask the user whether to continue (delete and re-create) or pick a different name.
- ALWAYS fill in `### Contract` blocks in tasks.md before committing. Placeholder comments in Contract blocks are plan failures — the evaluator cannot score against empty criteria.
- `context` and `rules` from `openspec instructions` output are constraints on YOU (the agent), not content to copy into artifact files.
