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
