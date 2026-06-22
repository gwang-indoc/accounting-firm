---
Date: 2026-06-22
Change: export-ui-refactor
Status: REVIEWED
---

## Goals

- Move the Export button to the page header so it is always visible (not hidden behind a conditional toolbar)
- Move the "Select all" button from the right-side toolbar into the `<th class="select-col">` table header cell, left-aligned with the checkbox column
- Simplify the export-toolbar strip to show only count + Clear (no duplicate Export button)

## Non-Goals

- No backend changes
- No changes to export dialog, export logic, or download flow
- No changes to individual row checkbox behaviour
- No changes to the 200-client selection cap logic
- No changes to pagination, filtering, or other toolbar elements

## Constraints

- Frontend only: `admin-clients.component.html` / `.css` / `.ts`
- "Select all" retains its current server-fetch behaviour (calls `GET /api/clients/ids` with active filters — selects all matching results across all pages, not just the visible page)
- Export button must be disabled (not hidden) when selection is empty so admins can see it exists before making a selection
- Must not break existing `data-testid` attributes (`export-btn`, `select-all-btn`, `deselect-all-btn`, `export-toolbar`)

## Success Criteria

- Export button renders in `.page-header` row at all times (greyed/disabled when `selectedClientIds().size === 0`)
- `<th class="select-col">` contains the "Select all" button; it is no longer rendered inside `.toolbar-actions`
- Export toolbar (`.export-toolbar`) shows badge + count + Clear only — no Export button inside it
- "Add Client" button remains in `.toolbar-actions` (right side of `table-toolbar`)
- Playwright e2e: existing tests still pass; the assertion at `admin-client-export.spec.ts:45` (`export-btn` visible after selection) becomes trivially true — update it to assert `export-btn` is **disabled** before selection and **enabled** after selection
- All existing frontend unit tests still pass: `cd frontend && npx ng test --no-watch`

## User Stories

1. As an admin, I can see the Export button as soon as I land on the Client Management page, so I know bulk export is available without selecting anything first
2. As an admin, I see "Select all" directly above the checkbox column, so the spatial relationship between the control and the column it affects is obvious
3. As an admin, after making a selection the toolbar strip shows only the count and a Clear option — I use the header Export button to trigger the export

## Open Questions

- None

## Referenced Capabilities

- `openspec/specs/admin-client-export/spec.md` — "Export toolbar and dialog appear when clients are selected" requirement: this change modifies WHERE the Export button lives (header vs. toolbar) while keeping the dialog/download flow identical
- `openspec/specs/admin-client-export/spec.md` — "Admin client list supports multi-select" requirement: "Select all" control moves column but retains all-pages server-fetch behaviour
