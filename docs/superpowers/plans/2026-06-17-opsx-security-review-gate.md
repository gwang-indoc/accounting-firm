# Security-Review Gate in /opsx:apply — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/opsx:apply` run the built-in `/security-review` as a final gate that blocks completion on Critical/High/Medium findings, with the task auto-generated into every `tasks.md` by the schema.

**Architecture:** Two markdown edits — (A) the schema's `tasks.instruction` gains a mandatory final-group `/security-review` task ordered before `verification-before-completion`; (B) `.claude/commands/opsx/apply.md` gains a dispatch rule + guardrail that invokes the `security-review` skill inline on the branch diff, reads severities, and pauses on Critical/High/Medium.

**Tech Stack:** OpenSpec workflow markdown (`schema.yaml`), Claude Code command markdown, built-in `/security-review` command. No application code, no unit-test framework — verification is by regenerating/inspecting task output and dry-running dispatch logic.

**Design doc:** `docs/superpowers/specs/2026-06-17-opsx-security-review-gate-design.md`

---

### Task 1: Add security-review task to the schema's task generation

**Files:**
- Modify: `openspec/schemas/superpowers-driven/schema.yaml` (the `tasks.instruction` block, "Review checkpoints (mandatory)" section)

The current "Review checkpoints (mandatory)" section reads:

```
      **Review checkpoints (mandatory):**
      - Each `## N` task group MUST end with:
        `- [ ] N.Z Run superpowers:requesting-code-review on the diff for group N; address CRITICAL/HIGH findings before moving on`
      - Final group MUST include:
        `- [ ] N.Z Run superpowers:verification-before-completion`
        (N = final group number; Z = last position in that group)
```

- [ ] **Step 1: Edit the final-group rule to mandate two ordered tasks**

Replace the `Final group MUST include:` bullet and its sub-line with an ordered pair. New text for that bullet:

```
      - Final group MUST include, in order:
        `- [ ] N.Y Run /security-review on the branch diff; address Critical/High/Medium findings before proceeding`
        `- [ ] N.Z Run superpowers:verification-before-completion`
        (N = final group number; Y = second-to-last position, Z = last position in that group)
```

Leave the per-group `requesting-code-review` bullet unchanged.

- [ ] **Step 2: Verify the YAML still parses and contains both ordered tasks**

Run:
```bash
cd /Users/gwang/Develop/accounting-firm && python3 -c "import yaml,sys; d=yaml.safe_load(open('openspec/schemas/superpowers-driven/schema.yaml')); t=[a for a in d['artifacts'] if a['id']=='tasks'][0]['instruction']; assert '/security-review on the branch diff' in t, 'security task missing'; assert t.index('/security-review on the branch diff') < t.index('verification-before-completion'), 'order wrong: security must precede verification'; print('OK: security-review precedes verification in tasks.instruction')"
```
Expected: `OK: security-review precedes verification in tasks.instruction`

- [ ] **Step 3: Commit**

```bash
git add openspec/schemas/superpowers-driven/schema.yaml
git commit -m "feat: schema generates /security-review task in final task group"
```

---

### Task 2: Add the dispatch rule + guardrail to /opsx:apply

**Files:**
- Modify: `.claude/commands/opsx/apply.md` (step 3 dispatch list near line 117; Guardrails list near lines 145-149)

- [ ] **Step 1: Add the `/security-review` dispatch rule**

In step 3, the final dispatch bullet currently reads:

```
- **Final group's verification task** (`Run superpowers:verification-before-completion`) → invoke `superpowers:verification-before-completion`. Runs pytest / vitest / e2e / `console.log` audit. Fix any failures before marking complete.
```

Insert a new bullet IMMEDIATELY BEFORE that bullet:

```
- **`- [ ] N.X Run /security-review ...`** → invoke the `security-review` skill on the current branch diff. Read the findings report by severity (findings land in your own context — no parsing contract needed).
  - **Critical / High / Medium present** → pause: "Security gate BLOCKED — {count} findings (Critical/High/Medium). Options: (1) fix then resume, (2) waive with written justification, (3) abort apply." Do NOT mark the checkbox until none remain or the user explicitly waives.
  - **Low only (or none)** → log the Low findings as advisory, mark the checkbox `[x]`, continue to the verification task.
```

- [ ] **Step 2: Add the guardrail bullet**

In the Guardrails list, after the bullet:
```
- DON'T proceed past a group's checkpoint with unaddressed CRITICAL or HIGH review findings.
```
append:
```
- DO run `/security-review` at the final gate; block completion on unaddressed Critical/High/Medium findings (Low is advisory).
```

- [ ] **Step 3: Verify both insertions are present and correctly ordered**

Run:
```bash
cd /Users/gwang/Develop/accounting-firm && python3 -c "
s=open('.claude/commands/opsx/apply.md').read()
assert 'invoke the \`security-review\` skill on the current branch diff' in s, 'dispatch rule missing'
assert 'Security gate BLOCKED' in s, 'block message missing'
assert s.index('Run /security-review') < s.index('Run superpowers:verification-before-completion. Runs pytest'.split(' Runs')[0]) or s.index('security-review\` skill on the current branch') < s.index('invoke \`superpowers:verification-before-completion\`'), 'security dispatch must precede verification dispatch'
assert 'DO run \`/security-review\` at the final gate' in s, 'guardrail missing'
print('OK: dispatch rule, block message, and guardrail present; security precedes verification')
"
```
Expected: `OK: dispatch rule, block message, and guardrail present; security precedes verification`

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/opsx/apply.md
git commit -m "feat: /opsx:apply runs /security-review final gate, blocks on Critical/High/Medium"
```

---

### Task 3: End-to-end verification on a sample

**Files:** none modified — verification only.

- [ ] **Step 1: Confirm a freshly generated final group would carry the task**

Re-read the updated `tasks.instruction` and hand-author a sample final group following it. Confirm it produces, in order:
```
- [ ] N.Y Run /security-review on the branch diff; address Critical/High/Medium findings before proceeding
- [ ] N.Z Run superpowers:verification-before-completion
```
Expected: security task appears immediately before verification.

- [ ] **Step 2: Dry-run the dispatch logic against sample finding sets**

Walk the apply dispatch rule by hand for three cases and confirm the outcome:

| Findings | Expected behavior |
|---|---|
| 1 Critical | PAUSE with 3 options; checkbox stays `[ ]` |
| 2 Medium, 1 Low | PAUSE with 3 options; checkbox stays `[ ]` |
| 3 Low only | Log advisory; mark `[x]`; continue to verification |

Expected: Critical/High/Medium → pause; Low-only → continue. Matches the design.

- [ ] **Step 3: Run superpowers:verification-before-completion**

Invoke `superpowers:verification-before-completion`. For this markdown-only change, the verification commands are the two `python3` assertion checks from Tasks 1 and 2 — re-run both, confirm both print `OK: ...`. There is no pytest/vitest surface to run.

- [ ] **Step 4: Update the dev log**

Append an entry to `docs/log/2026-06-17.md` (create if absent) summarizing: built-in `/security-review` wired as `/opsx:apply` final gate, schema auto-generates the task, blocks on Critical/High/Medium.

- [ ] **Step 5: Commit**

```bash
git add docs/log/2026-06-17.md
git commit -m "docs: log security-review apply gate change"
```

---

## Self-Review

**Spec coverage:**
- Design §A (schema task generation) → Task 1. ✔
- Design §B (apply dispatch + guardrail) → Task 2. ✔
- Severity gate (Critical/High/Medium block, Low advisory) → Task 2 Step 1, Task 3 Step 2. ✔
- Ordering (security before verification) → Task 1 Step 1/2, Task 2 Step 3. ✔
- Inline invocation, no parser → Task 2 Step 1 wording. ✔
- Verification (regenerate + dry-run) → Task 3. ✔
- Dev log (repo convention) → Task 3 Step 4. ✔

No gaps.

**Placeholder scan:** No TBD/TODO; every edit shows exact old/new text and exact verification commands. ✔

**Type consistency:** Task names consistent — `/security-review` task text identical in schema (Task 1) and sample (Task 3); block message "Security gate BLOCKED" identical in Task 2 and Task 3. ✔
