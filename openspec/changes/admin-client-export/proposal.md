---
Date: 2026-06-17
Change: admin-client-export
Requirements: requirements.md
---

## Why

Admins currently have no way to bulk-export client data — they can only view clients in the UI and download documents one at a time. This change gives admins a self-service export action to produce client metadata CSVs and document ZIPs for any selection of their clients.

## What Changes

- Admin client list gains a checkbox column enabling multi-select of any number of clients.
- A "Select all (filtered)" action fetches all client IDs matching the current filter across pages and holds them in frontend state.
- An "Export" toolbar appears when ≥1 client is selected, opening a dialog to configure what to include (metadata, documents, or both) and a year filter (All years or a specific year).
- New backend endpoint `POST /api/clients/export` streams either a CSV or a ZIP response depending on the requested content.
- Hard cap: 200 clients per export request; server returns 400 if exceeded.
- ZIP folder naming always uses `{ClientName}-{clientId}/` (unique, no collision detection needed).
- Server enforces admin ownership — only the authenticated admin's own clients can be exported.

## Capabilities

### New Capabilities

- `admin-client-export` — Multi-select + export endpoint: CSV for metadata, ZIP for documents, or both. Includes the frontend export dialog, "select all filtered" fetch, and the streaming backend endpoint.

### Modified Capabilities

None. The `client-management` and `client-document-uploads` capabilities are read-only dependencies here — their API contracts and requirements are unchanged.

## Impact

- **Backend:** New controller method on `/api/clients/export` (or a dedicated `AdminExportController`). New service `AdminExportService` for CSV generation and ZIP streaming. Reads `ClientRepository`, `ClientDocumentRepository`, `LocalStorageService`.
- **Frontend:** `admin-clients.component.ts` — adds checkbox column, select-all logic, export toolbar. New `AdminExportDialogComponent` for content/year selection. New `AdminExportService` for the export API call and file download trigger.
- **No DB migrations** — export is read-only.
- **No new dependencies** — ZIP via `ZipOutputStream` (already used in `MeDocumentService`), CSV via plain `StringBuilder` or `PrintWriter`.

## Out of Scope

- Per-client export from the client detail page (deferred to a future change if needed).
- Export scheduling or email delivery.
- Message history export.
- Progress streaming (loading spinner only for now).
