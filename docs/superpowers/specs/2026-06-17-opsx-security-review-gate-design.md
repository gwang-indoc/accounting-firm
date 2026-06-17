# Design: security-review gate in /opsx:apply

- **Date:** 2026-06-17
- **Topic:** opsx-security-review-gate
- **Status:** REVIEWED

## Goals

- `/opsx:apply` runs the built-in `/security-review` command once at the end of a change, on the current branch diff.
- The security-review task is auto-generated into `tasks.md` by the schema (the "generate related task" part), so every future change carries it without manual authoring.
- Completion blocks on Critical/High/Medium findings; Low is advisory.

## Non-Goals

- Per-task-group security gates (only a single final gate).
- Using the ECC `security-review` checklist skill (Next.js/Supabase/Solana flavored — wrong stack).
- Custom repo-specific security prompts feeding the command.
- Structured-output (JSON) wrapping of the command — inline reading is sufficient.

## Decisions

### 1. Mechanism: built-in `/security-review`

Use Claude Code's built-in `/security-review` command, not the ECC checklist skill. It is stack-agnostic, operates on the branch diff, and filters to high-confidence exploitable issues (low false-positive bias).

**Output shape:** a markdown findings report — each finding has Severity (Critical/High/Medium/Low), `file:line` location, description, and a fix recommendation; reports "no issues found" when clean. Not structured JSON.

### 2. Timing: final gate only, whole-branch diff

A single review near the end matches the command's "pending changes on current branch" semantics. Cheap and simple; avoids the redundant reviews a per-group gate would cause.

Ordering in the final group: **security-review before `verification-before-completion`**. Security fixes are code changes, so verification re-runs tests afterward and confirms nothing broke.

### 3. Findings gate: block on Critical/High/Medium

- **Critical / High / Medium present** → pause and present options (mirrors the existing evaluator BLOCK behavior).
- **Low only** → log advisory, mark the task complete, continue.

### 4. Invocation: inline

The apply agent invokes the `security-review` skill directly. Findings land in the apply agent's own context, so it reads severity labels and decides block vs continue — no parser, no JSON contract. Same pattern the evaluator uses for `requesting-code-review`. A fresh-context subagent is unnecessary for a single terminal one-shot.

## Edit points

### A. Schema — `openspec/schemas/superpowers-driven/schema.yaml` (`tasks.instruction`)

Replace the single final-group rule with two ordered tasks:

```
- Final group MUST include, in order:
  - [ ] N.Y Run /security-review on the branch diff; address Critical/High/Medium findings before proceeding
  - [ ] N.Z Run superpowers:verification-before-completion
```

This is where the security task gets generated into every `tasks.md` produced by `/opsx:propose`.

### B. Command — `.claude/commands/opsx/apply.md`

Add a dispatch rule in step 3 for the `Run /security-review` prefix:

- Invoke the `security-review` skill on the current branch diff.
- Read findings by severity from the report.
- **Critical / High / Medium present** → pause:
  > "Security gate BLOCKED — N findings (Critical/High/Medium). Options: (1) fix then resume, (2) waive with written justification, (3) abort apply."

  Do not mark `[x]` until none remain or the user explicitly waives.
- **Low only** → log advisory, mark `[x]`, continue.

Add one guardrail bullet:
> "DO run `/security-review` at the final gate; block completion on unaddressed Critical/High/Medium findings."

## Risks / Trade-offs

- **Medium-severity blocking adds friction** → mitigated by the explicit waive-with-justification option.
- **Output format not schema-guaranteed** (CLI is minified, no spec to grep) → inline reading tolerates prose; if format proves flaky later, wrap in a subagent with a StructuredOutput schema.
- **Inline review pollutes apply context with findings** → acceptable; it is the final gate, little work follows.

## Verification

No pytest/vitest — this is workflow markdown.

- Regenerate a `tasks.md` from the updated instruction → confirm the final group contains the `/security-review` task immediately before `verification-before-completion`.
- Dry-run the apply dispatch logic against sample finding sets → confirm Critical/High/Medium pauses with the three options, Low-only continues.

## Open Questions

None.
