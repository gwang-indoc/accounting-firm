---
Date: 2026-06-22
Change: export-ui-refactor
Requirements: requirements.md
---

## Why

The export button is buried inside a conditional toolbar that only appears after making a selection, making the feature invisible on first visit. The "Select all" control sits on the right side of the toolbar with no spatial relationship to the checkbox column it affects.

## What Changes

- Move the Export button from `.export-toolbar` into `.page-header`, always visible, disabled when selection is empty
- Move the "Select all" button from `.toolbar-actions` (right-side) into `<th class="select-col">` (left, above the checkbox column)
- Strip `.export-toolbar` down to badge + count label + Clear button only (no Export button inside it)
- Update e2e test: replace `export-btn` visible-after-selection assertion with disabled-before → enabled-after assertion

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-client-export` — delta spec covering changes to export button placement and "Select all" control placement; the "Export toolbar and dialog appear when clients are selected" and "Admin client list supports multi-select" requirements need updated SHALL clauses

## Impact

- `frontend/src/app/features/admin/clients/admin-clients.component.html` — template restructure
- `frontend/src/app/features/admin/clients/admin-clients.component.css` — new/updated styles for header export button, `<th>` select-all, stripped export-toolbar
- `e2e/admin-client-export.spec.ts` — update one assertion (line 45)

## Out of Scope

- Backend changes (deferred: none planned)
- Export dialog, download logic, or snackbar error handling
- Pagination, filters, or other toolbar elements
- Per-row checkbox behaviour or the 200-client cap logic
