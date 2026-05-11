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
