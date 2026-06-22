## Context

`AdminClientsComponent` currently places the Export button inside `.export-toolbar`, a conditionally-rendered strip that appears only when ≥1 client is selected. The "Select all" button lives in `.toolbar-actions` on the right side of the table toolbar, with no spatial link to the checkbox column it controls.

All changes are confined to one component: `admin-clients.component.html` + `.css`. No TS logic changes are required. The e2e spec (`admin-client-export.spec.ts`) needs one assertion updated.

## Goals / Non-Goals

**Goals:**
- Export button always visible in page header; disabled when selection is empty
- "Select all" rendered in `<th class="select-col">` above the checkbox column
- Export toolbar stripped to badge + count + Clear only

**Non-Goals:**
- No backend or service changes
- No changes to export dialog, download logic, or TS component logic
- No changes to per-row checkbox behavior or 200-cap enforcement

## Decisions

### 1. Page header becomes a flex row

**Decision:** Add `display: flex; justify-content: space-between; align-items: flex-start` to `.page-header` so the title/subtitle stack sits left and the header action buttons sit right.

**Rationale:** The simplest change — one CSS addition, no structural HTML changes beyond adding the Export button element.

**Alternative considered:** Placing the Export button in `.toolbar-actions` (alongside Add Client). Rejected: that moves it further from the title hierarchy and it would still feel like a secondary action rather than a page-level affordance.

### 2. Export button disabled state via `[disabled]` binding

**Decision:** Bind `[disabled]="selectedClientIds().size === 0"` on the header export button. Style `.header-export-btn:disabled` with reduced opacity and `cursor: not-allowed`.

**Rationale:** Matches the existing `[disabled]="isExporting()"` pattern on the toolbar export button. No new TS signals needed.

### 3. "Select all" moves into `<th class="select-col">` — same HTML, new location

**Decision:** Cut the `<button class="select-all-btn">` from `.toolbar-actions` and paste it into `<th class="select-col">`. Remove `.toolbar-actions` if it becomes empty (it won't — Add Client stays there).

**Rationale:** Direct spatial alignment: the button lives in the column header it controls. No logic change — same click handler, same `data-testid`.

**Alternative considered:** Adding a checkbox in `<th>` (select-page pattern). Rejected: the current "Select all" fetches server-side IDs across all pages — that semantic is non-obvious for a checkbox. A labelled text button makes the scope explicit.

### 4. Export toolbar loses its Export button

**Decision:** Remove the `<button class="export-action-btn">` block from `.export-toolbar`. The toolbar keeps badge + label + Clear only. The `isExporting()` spinner moves to the header export button.

**Rationale:** The header button is the canonical export trigger; duplicating it in the toolbar creates two buttons with the same action.

**Risk:** The loading spinner (currently on the toolbar export button) must move to the header export button so users see feedback when the export is in flight. See Risks section.

## Risks / Trade-offs

**[Loading spinner location]** → After the refactor, `isExporting()` spinner must be on the header export button. Forgetting to move it leaves no in-flight feedback. Mitigation: include spinner logic in the header button during the HTML restructure; the e2e test for "loading state during export" will catch a regression.

**[e2e assertion weakening]** → `admin-client-export.spec.ts:45` currently checks `export-btn` visible after selection — trivially true after the refactor. Mitigation: update that assertion to check `export-btn` is disabled before selection and enabled after selection.

**[`select-col` width]** → `<th class="select-col">` currently has no padding or min-width for a button. The "Select all" button (height 34px, ~110px wide) will overflow the cell. Mitigation: add `min-width: 110px; padding: 6px 10px` to `.clients-table th.select-col`.

## Migration Plan

No deployment steps required — frontend-only CSS/HTML change. No feature flag needed.

## Open Questions

None.
