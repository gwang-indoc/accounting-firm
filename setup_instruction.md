# Setup Instructions — OpenSpec + Superpowers Workflow

This guide walks new developers through setting up the OpenSpec + Superpowers workflow used in this project. Once set up, every feature or fix follows the same three-phase loop: **propose → apply → archive**.

---

## Prerequisites

- [Claude Code CLI](https://docs.claude.com/en/docs/claude-code) installed and authenticated
- Node.js 20+ and npm
- Git, configured with SSH access to your GitHub remote

---

## Reference Documents

You will receive three working reference files alongside this guide. Keep them handy — every step below points back to one of them:

| File | Purpose | Used in |
|---|---|---|
| `CLAUDE.md` | Sample project-level instructions for Claude Code (tech stack, layered architecture, TDD discipline, `tasks.md` structure, dev-log format) | Step 4 |
| `openspec/config.yaml` | Sample OpenSpec configuration (project context + per-artifact rules injected into every proposal/design/tasks prompt) | Step 5 |
| `.claude/skills/git-command-push/SKILL.md` | Sample Claude Code skill that stages all changes, writes a conventional-commits message, and pushes to `origin` over SSH | Step 9 |

Drop the first two into your project root (and `openspec/` respectively) as starting points, then customize. Drop the skill file into `.claude/skills/git-command-push/` to enable the `/git-command-push` command in your project.

---

## Step 1 — Install OpenSpec

OpenSpec is the change-management tool that scaffolds proposals, designs, specs, and task lists.

```bash
npm install -g @fission-codes/openspec
# Verify
openspec --version
```

Initialize OpenSpec inside your project root (only if your project does not yet have an `openspec/` directory):

```bash
cd <your-project-root>
openspec init
```

This creates:

```
openspec/
├── config.yaml      # project-wide rules + context
├── specs/           # capability specs (the source of truth)
└── changes/         # in-flight change proposals
```

> **Reference:** See `openspec/config.yaml` in this repo as a working example.

---

## Step 2 — Install the Superpowers Plugin (Project Scope)

Superpowers provides the AI-assisted development skills (brainstorming, TDD, subagent-driven development, code review, verification).

In Claude Code, install at the **project** level so the skill set is shared with anyone who clones the repo:

```bash
# from your project root
claude plugin install superpowers --scope project
```

After installation, the plugin's skills become available via the `Skill` tool (e.g., `superpowers:brainstorming`, `superpowers:test-driven-development`).

> Verify the install with `claude plugin list` — `superpowers` should appear under project-scoped plugins.

---

## Step 3 — Install the Playwright Plugin (Project Scope)

Playwright drives the end-to-end browser tests that every UI-touching change must include.

```bash
# from your project root
claude plugin install playwright --scope project
```

Then create an `e2e/` directory at the project root and install Playwright as a dev dependency for that folder:

```bash
mkdir -p e2e && cd e2e
npm init -y
npm install --save-dev @playwright/test
npx playwright install        # downloads browser binaries
```

---

## Step 4 — Create `CLAUDE.md` in Your Project Root

`CLAUDE.md` tells Claude Code how to behave inside *your* repo: tech stack, layered architecture, test commands, TDD discipline, the `tasks.md` structure rules, and the dev-log practice.

1. Copy this project's `CLAUDE.md` as a starting point:

   ```bash
   cp <path-to-this-repo>/CLAUDE.md <your-project-root>/CLAUDE.md
   ```

2. Edit each section to match **your** project. The sections you almost always need to adjust:

   | Section | What to update |
   |---|---|
   | **Project Overview** | Project purpose and a one-line tech-stack summary |
   | **Repository Structure** | Top-level directories and a brief note on what lives in each |
   | **Backend → Key Architecture** | Package/module root, layered architecture, authentication strategy, session/token scheme, required environment variables, database-migration path |
   | **Backend Tests** | Test framework, slice/integration test conventions, and the commands to run all tests vs. a single class |
   | **Frontend → Key Architecture** | Framework + version, change-detection or rendering mode, auth-state pattern, HTTP interceptor or middleware, route guards, and any dev-server proxy paths |
   | **Frontend Tests** | Test runner, assertion conventions, and the commands to run all tests vs. a single file |
   | **E2E Tests** | Location of the E2E suite, run commands, and the prerequisite servers needed before tests run |
   | **OpenSpec Workflow** | Keep the skill ordering — `brainstorming` → `test-driven-development` → `subagent-driven-development` → `requesting-code-review` |
   | **Coding Guidelines** | Tweak only if your team has different conventions |
   | **Dev Log Practice** | Adjust path if your log location differs from `docs/log/YYYY-MM-DD.md` |

   > **Tip:** You don't have to edit `CLAUDE.md` by hand. Open the file in Claude Code and just describe your project — for example:
   > > "Please update CLAUDE.md for my project. Tech stack is `<your stack>`, package root is `<...>`, tests run with `<...>`, frontend lives in `<...>`. Keep the OpenSpec workflow and coding-guidelines sections as-is."
   >
   > Claude Code will rewrite the relevant sections for you. Review the diff and commit.

3. Commit `CLAUDE.md` to your repo so every collaborator (and Claude Code) sees the same instructions.

> **Why this matters:** Claude Code reads `CLAUDE.md` at the start of every session and treats it as overriding default behavior. Mistakes here propagate into every change.

---

## Step 5 — Update `openspec/config.yaml`

`config.yaml` defines two things that get injected into every artifact prompt:

- **`context:`** — your project's tech stack, conventions, and Superpowers integration rules
- **`rules:`** — per-artifact rules for `proposal.md`, `design.md`, `tasks.md`

1. Copy this project's `openspec/config.yaml` as a starting point:

   ```bash
   cp <path-to-this-repo>/openspec/config.yaml <your-project-root>/openspec/config.yaml
   ```

2. Edit each section to match **your** project:

   | Section | What to update |
   |---|---|
   | **`context:` → Tech stack** | Backend framework + language, frontend framework, database, and authentication mechanism |
   | **`context:` → Backend structure** | Package/module root, layered architecture, data layer, migration tool + path, configuration files, and required environment variables |
   | **`context:` → Backend tests** | Test framework, slice/integration conventions, and run commands (full suite + single class) |
   | **`context:` → Frontend structure** | Routing model, HTTP-service location, auth-state pattern, and dev-server proxy paths |
   | **`context:` → Frontend tests** | Test runner, assertion conventions, and run commands (full suite + single file) |
   | **`context:` → E2E tests** | Suite path, run commands, and the prerequisite servers required before tests run |
   | **`context:` → Conventions** | Migration policy, input-validation rules, and lint command |
   | **`context:` → Superpowers integration** | Keep this block as-is — it encodes the brainstorming → confirmation gate → artifact generation flow |
   | **`rules:` → proposal** | Adjust only if your project has different proposal requirements |
   | **`rules:` → design** | Adjust only if your project has different design requirements |
   | **`rules:` → tasks** | Update the test-framework names in the RED/GREEN rule and the verification commands; keep the parallel, code-review, E2E, and verification rules |

   > **Tip:** You don't have to edit `config.yaml` by hand either. Open it in Claude Code and describe your project — for example:
   > > "Please update `openspec/config.yaml` for my project. Tech stack is `<your stack>`, backend package root is `<...>`, backend tests use `<...>`, frontend uses `<...>` with `<test runner>`, E2E lives at `<path>` and runs with `<command>`. Keep the Superpowers integration block under `context:` and all `rules:` entries as-is."
   >
   > Claude Code will rewrite the relevant sections. Review the diff and commit.

3. Commit `config.yaml`. From this point on, every `/opsx:propose` and `/opsx:apply` invocation reads these rules.

> **Why this matters:** OpenSpec injects `context:` into every artifact's instruction prompt, and `rules:` are appended to artifact-specific instructions. Bad rules produce bad artifacts.

---

## Step 6 — Run the Design + Implementation Phases

The full development workflow is documented in `docs/workflow.md`. The summary:

```
/opsx:propose  →  /opsx:apply  →  (verify locally)  →  /opsx:archive
   (Design)        (Implement)        (this guide)        (Complete)
```

In this step you run the first two phases. **Stop after Phase B** — local verification (Step 7) happens before you archive.

### Phase A — `/opsx:propose <change-name>`

1. **Brainstorm.** `superpowers:brainstorming` runs first automatically.
   - Explore existing code and recent commits for context
   - Answer the AI's clarifying questions one at a time
   - Review the 2–3 proposed approaches and pick one
2. **Approve the design** section by section.
3. **Spec gets written** to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` and committed.
4. **CONFIRMATION GATE.** The AI will stop and ask:
   > "Design is ready. Shall I go ahead and generate the OpenSpec artifacts?"
   - Reply **"yes"** or **"go ahead"** to proceed.
5. **Artifacts generated:** `openspec/changes/<name>/proposal.md`, `design.md`, `tasks.md`.
6. **Review `tasks.md`.** Confirm every `## N` group ends with a code-review checkpoint (`N.Z`) and a dev-log update task (`N.Z+1`). Confirm the final UI-touching group has an E2E task before the verification-before-completion task.

### Phase B — `/opsx:apply <change-name>`

1. **TDD discipline** invoked. No production code is written before a failing test.
2. **Subagents dispatched per task.** Each subagent:
   - Writes the failing test → runs it → confirms RED
   - Writes minimal impl → runs the test → confirms GREEN
   - Self-reviews and commits
3. **Two-stage review** after each task:
   - **Spec compliance** — does the code match the spec?
   - **Code quality** — naming, structure, no smells
4. **Checkbox discipline.** `- [ ]` → `- [x]` immediately on each task completion.
5. **Code-review checkpoint** (`N.Z`) at the end of each group. Critical/high findings must be fixed before the next group starts.
6. **Dev log update** (`N.Z+1`) — append to `docs/log/YYYY-MM-DD.md` with commit hash, feature bullets, review findings, test count, and TDD evidence.
7. **E2E test** for any UI change (Playwright file under `e2e/`).
8. **Verification before completion.** Run the full backend + frontend test suite and grep for `System.out.println` / `console.log`.

---

## Step 7 — Verify Locally and Sync Specs

Even after `/opsx:apply` reports success, **always run the project locally** and exercise the new feature in the browser (or via your CLI / API client, depending on what you built). Automated tests do not catch every issue — copy mistakes, layout glitches, missing validation messages, and small UX problems usually show up only in a real run.

> The exact commands to start your project depend on your tech stack — use whatever your project's README documents.

If you find small fixes are needed, apply them directly and then **ask Claude Code to sync the change with OpenSpec specs** so the specs stay aligned with the implementation:

> "Please sync the recent fixes back into the relevant OpenSpec specs under `openspec/specs/`."

Claude Code will edit the affected `spec.md` files so the requirements match what shipped. Without this step, the spec drifts from reality and future changes are built on a stale source of truth.

---

## Step 8 — Archive the Change (`/opsx:archive <change-name>`)

Once local verification passes and specs are synced, archive the change:

1. **Artifact + task completion** check.
2. **Delta-spec sync prompt.** If the change introduced new spec deltas, sync them into `openspec/specs/` (recommended).
3. **Archive.** The change moves to `openspec/changes/archive/YYYY-MM-DD-<name>/`.

---

## Step 9 — Push to GitHub

Commit and push:

```bash
/git-command-push
```

This skill stages all changes, writes a conventional-commits message, and pushes to `origin` over SSH.

---

## Quick Reference

| Step | Command / File | Purpose |
|---|---|---|
| 1 | `npm install -g @fission-codes/openspec` | Install OpenSpec CLI |
| 2 | `claude plugin install superpowers --scope project` | Install AI skills |
| 3 | `claude plugin install playwright --scope project` + `npx playwright install` | Install E2E tooling |
| 4 | `CLAUDE.md` | Tell Claude Code your project conventions |
| 5 | `openspec/config.yaml` | Inject context + rules into every artifact |
| 6 | `/opsx:propose` → `/opsx:apply` | Design and implement the change |
| 7 | Manual local verification + spec sync | Catch what tests miss; keep specs honest |
| 8 | `/opsx:archive` | Archive the completed change |
| 9 | `/git-command-push` | Commit and push |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `/opsx:propose` skips brainstorming | `config.yaml` missing the Superpowers integration block under `context:` | Restore the block from this repo's config.yaml |
| Artifacts generated without confirmation | Confirmation gate not in `config.yaml` `context:` | Add the CONFIRMATION GATE paragraph |
| `tasks.md` has no `N.Z` or RED/GREEN pairs | `rules:` → `tasks:` not configured | Copy the `rules:` block from this repo |
| Subagent runs no tests | TDD skill not invoked at session start | Confirm `superpowers:test-driven-development` is the first skill in the apply flow |
| E2E task missing on UI changes | `tasks:` rule for E2E not present | Add the E2E rule to `config.yaml` |
| Spec drifts from code after manual fixes | Step 7 skipped | Ask Claude Code to sync the changed behavior back into `openspec/specs/` |

---

## Next Steps

- Read `docs/workflow.md` for the full step-by-step playbook
- Read `CLAUDE.md` for the coding guidelines and dev-log format
- Read `openspec/config.yaml` for the rules every artifact must satisfy
- Try a small change end-to-end to internalize the loop before tackling something complex
