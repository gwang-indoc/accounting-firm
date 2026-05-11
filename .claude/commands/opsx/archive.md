---
name: "OPSX: Archive"
description: Archive a completed change in the experimental workflow
category: Workflow
tags: [workflow, archive, experimental]
---

Archive a completed change in the experimental workflow.

**Input**: Optionally specify a change name after `/opsx:archive` (e.g., `/opsx:archive add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show only active changes (not already archived).
   Include the schema used for each change if available.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check artifact completion status**

   Run `openspec status --change "<name>" --json` to check artifact completion.

   Parse the JSON to understand:
   - `schemaName`: The workflow being used
   - `artifacts`: List of artifacts with their status (`done` or other)

   **If any artifacts are not `done`:**
   - Display warning listing incomplete artifacts
   - Prompt user for confirmation to continue
   - Proceed if user confirms

3. **Check task completion status**

   Read the tasks file (typically `tasks.md`) to check for incomplete tasks.

   Count tasks marked with `- [ ]` (incomplete) vs `- [x]` (complete).

   **If incomplete tasks found:**
   - Display warning showing count of incomplete tasks
   - Prompt user for confirmation to continue
   - Proceed if user confirms

   **If no tasks file exists:** Proceed without task-related warning.

4. **Assess delta spec sync state**

   Check for delta specs at `openspec/changes/<name>/specs/`. If none exist, proceed without sync prompt.

   **If delta specs exist:**
   - Compare each delta spec with its corresponding main spec at `openspec/specs/<capability>/spec.md`
   - Determine what changes would be applied (adds, modifications, removals, renames)
   - Show a combined summary before prompting

   **Prompt options:**
   - If changes needed: "Sync now (recommended)", "Archive without syncing"
   - If already synced: "Archive now", "Sync anyway", "Cancel"

   If user chooses sync, use Task tool (subagent_type: "general-purpose", prompt: "Use Skill tool to invoke openspec-sync-specs for change '<name>'. Delta spec analysis: <include the analyzed delta spec summary>"). Proceed to archive regardless of choice.

5. **Perform the archive**

   Create the archive directory if it doesn't exist:
   ```bash
   mkdir -p openspec/changes/archive
   ```

   Generate target name using current date: `YYYY-MM-DD-<change-name>`

   **Check if target already exists:**
   - If yes: Fail with error, suggest renaming existing archive or using different date
   - If no: Move the change directory to archive

   ```bash
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
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
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs

All artifacts complete. All tasks complete.
```

**Output On Success (No Delta Specs)**

```
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** No delta specs

All artifacts complete. All tasks complete.
```

**Output On Success With Warnings**

```
## Archive Complete (with warnings)

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** Sync skipped (user chose to skip)

**Warnings:**
- Archived with 2 incomplete artifacts
- Archived with 3 incomplete tasks
- Delta spec sync was skipped (user chose to skip)

Review the archive if this was not intentional.
```

**Output On Error (Archive Exists)**

```
## Archive Failed

**Change:** <change-name>
**Target:** openspec/changes/archive/YYYY-MM-DD-<name>/

Target archive directory already exists.

**Options:**
1. Rename the existing archive
2. Delete the existing archive if it's a duplicate
3. Wait until a different date to archive
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
