---
name: "OPSX: Explore"
description: "Explore mode + draft requirements — produces docs/superpowers/specs/<date>-<topic>-requirements.md"
category: Workflow
tags: [workflow, explore, experimental, thinking]
---

4-phase explore command. Single user invocation, agent walks through phases in order.

**Input**: The argument after `/opsx:explore` is whatever the user wants to think about. Could be a vague idea ("real-time collaboration"), a specific problem ("the auth system is getting unwieldy"), a comparison ("postgres vs sqlite for this"), or nothing (just enter explore mode).

If a topic is given, derive a kebab-case `<topic>` from it (e.g., "real-time collaboration" → `realtime-collab`). The same `<topic>` will be the OpenSpec change name in `/opsx:propose`.

---

## Phase 1 — Explore stance (free thinking)

**This phase is the existing explore mode. NEVER write code, never modify code, never propose implementation. Thinking only.**

You may:
- Read files, search code, investigate the codebase
- Map existing architecture relevant to the discussion
- Find integration points and identify patterns already in use
- Surface hidden complexity
- Use ASCII diagrams liberally when they help
- Ask clarifying questions one at a time
- Compare options conversationally

You may NOT:
- Write or modify code
- Create OpenSpec artifacts (proposal/design/specs/tasks)
- Tell the user "now I'll implement"

The goal of Phase 1 is **the user's brain becomes clear about what they want**.

---

## Phase 2 — Draft requirements (DRAFT status)

When you judge that the conversation has reached enough clarity (typically after 5-15 turns), proactively offer:

> "I think we have enough to write a draft requirements doc. I'll save it to `docs/superpowers/specs/<date>-<topic>-requirements.md` with `Status: DRAFT`. We'll review it together in the next phase."

Wait for the user's confirmation. Then write the file using the requirements template (`openspec instructions requirements --schema superpowers-driven --json` returns the template). Required frontmatter:

```yaml
---
Date: <YYYY-MM-DD>
Change: <topic>
Status: DRAFT
---
```

Sections (Goals / Non-Goals / Constraints / Success Criteria / User Stories / Open Questions / Referenced Capabilities). Rough is fine. TODOs are allowed at this stage.

`git add` the file but DO NOT commit yet. Phase 4 commits.

---

## Phase 3 — Brainstorming review (REVIEWED status)

Invoke `superpowers:brainstorming` with the draft as input. Run its spec self-review checklist:

1. **Placeholder scan:** Any TBD / TODO / "..." / "fill in" remaining? Fix or escalate to the user.
2. **Internal consistency:** Do sections contradict each other? Does the architecture in (implicit) thinking match the requirements?
3. **Scope check:** Is this focused enough for a single OpenSpec change, or does it need decomposition? If it needs splitting, propose 2-3 sub-changes and ask which to pursue first.
4. **Ambiguity check:** Could any requirement be interpreted two ways? Pick one with the user, make it explicit.

**Additional inputs:** If the user supplies any new input before the doc reaches REVIEWED — new constraints, corrections, scope changes, extra requirements — fold it into the brainstorming review. Update the draft to reflect it and re-run the relevant checklist items. Do not treat the draft as frozen until REVIEWED is set.

**Review is an open loop, not one-shot.** After the checklist pass, stay in brainstorming. The user may keep discussing — raising questions, challenging decisions, exploring alternatives, adding requirements. Each round: discuss, update the draft, re-run the relevant checklist items. Repeat as many times as the user wants. The draft stays DRAFT throughout this loop.

**Final manual confirmation (required):** Do NOT change the status automatically and do NOT treat your own summary as the trigger. The loop ends only when the user explicitly says they are done. When you think it's settled, summarize what changed and ask — e.g. "Ready to mark this REVIEWED?" — but if the user responds with more discussion instead of confirming, go back into the loop. Only after an explicit user confirmation, change frontmatter `Status: DRAFT` → `Status: REVIEWED`. The propose phase will refuse to start if it sees `DRAFT`.

---

## Phase 4 — Commit + handoff

Commit the staged requirements. This is a checkpoint of the reviewed doc at its staging path — `/opsx:propose` later `git mv`s `requirements.md` into the change dir, where it archives with the change.

```bash
git add docs/superpowers/specs/<date>-<topic>-requirements.md
git commit -m "docs: stage requirements for <topic>"
```

Output to the user:

> "Requirements ready and reviewed. Next: `/opsx:propose <topic>` (do not auto-invoke; let the user trigger it)."

**Anti-pattern guard:** if the user says "just go ahead and propose / implement", REFUSE. Tell them: "Phase boundaries are explicit. Run `/opsx:propose <topic>` separately so the propose phase has a clean entry."

---

## Stance reminders

- One question at a time
- Multiple choice preferred over open-ended when applicable
- Patient — don't rush phases. If Phase 1 needs 20 turns, that's fine
- Visualize freely (ASCII diagrams)
- Open threads, not interrogations — surface multiple directions, let the user follow what resonates

## What you might do (not exhaustive)

**Explore the problem space** — clarifying questions, challenge assumptions, reframe, find analogies.

**Investigate the codebase** — map existing architecture, find integration points, identify patterns already in use, surface hidden complexity.

**Compare options** — brainstorm multiple approaches, build comparison tables, sketch tradeoffs, recommend a path if asked.

**Visualize** — ASCII diagrams when text isn't sufficient.
