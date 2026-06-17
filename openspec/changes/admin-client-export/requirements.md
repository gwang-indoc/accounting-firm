---
Date: 2026-06-17
Change: admin-client-export
Status: REVIEWED
---

# Admin Client Export

## Goals

- Admin can select any number of clients from the client list and export their data in one action.
- Export includes client metadata (CSV), documents (ZIP), or both — admin chooses via a dialog before downloading.
- Document export supports filtering by a single year or all years.
- Metadata-only export delivers a direct CSV download (no ZIP wrapper).
- Export is scoped to the authenticated admin's own clients — cannot export another admin's clients.

## Non-Goals

- Exporting data for a single client via a per-client detail page (this is a bulk action from the client list).
- Scheduling or emailing exports (synchronous download only).
- Exporting message history or any data beyond client metadata and documents.
- Admin-to-admin sharing of export artifacts.
- Export formats other than CSV (metadata) and ZIP (documents).

## Constraints

- Backend must stream the ZIP response — do not buffer entire ZIP in memory. Use `ZipOutputStream` (pattern already in `MeDocumentService.zipForYear`).
- Admin may only export clients where `client.admin_id == authenticatedUser.id`. Server enforces this — not just the UI.
- File storage is local filesystem (`LocalStorageService`). Export reads from `clients/{clientId}/{year}/{filename}` paths.
- Allowed file types are already validated at upload time — no re-validation needed during export.
- Max clients per export request: TBD (open question — see below). Default guard at 200 clients.

## Success Criteria

- Admin selects ≥1 clients and sees an "Export" action.
- Export dialog presents three content options: metadata only, documents only, both.
- Year filter (All years / specific year) appears when documents are included.
- Metadata-only selection produces a `clients.csv` download with correct data for selected clients.
- Documents-only selection produces a ZIP with structure `{ClientName}-{clientId}/{year}/{filename}`.
- Both selected produces a ZIP with `clients.csv` at the root plus the document folder structure.
- Clients with no documents for the selected year are omitted from the ZIP (no empty folders).
- Server returns 403 if any requested client ID does not belong to the authenticated admin.
- Export works correctly for 1 client and for a large selection (≥50 clients).

## User Stories

### US-1: Export client metadata as CSV
As an admin, I want to select multiple clients and download their contact info as a CSV, so I can import it into a spreadsheet or CRM.

**Acceptance:**
- Checkbox column in client list enables multi-select.
- "Export" button/toolbar appears when ≥1 client is selected.
- Dialog option "Include client metadata" is checked by default.
- Selecting metadata only (no documents) and confirming triggers a CSV download.
- CSV columns: Name, Email, Phone, Created Date, Linked Portal User Email (empty if not linked).
- Filename: `clients-export-{YYYY-MM-DD}.csv`.

### US-2: Export documents for selected clients
As an admin, I want to download documents for selected clients as a ZIP, so I can archive or share them offline.

**Acceptance:**
- Dialog option "Include documents" is checked by default.
- Year filter defaults to "All years"; admin can pick a specific year.
- Confirming triggers a ZIP download.
- ZIP structure: `{ClientName}-{clientId}/{year}/{filename}` (e.g., `Acme Corp-42/2024/tax-return.pdf`).
- Clients with no documents in the selected year are silently skipped (not represented in ZIP).
- Filename: `documents-export-{YYYY-MM-DD}.zip`.

### US-3: Export both metadata and documents together
As an admin, I want a single download containing both the client list CSV and all their documents, so I have a complete snapshot in one file.

**Acceptance:**
- Both "Include client metadata" and "Include documents" checked.
- ZIP root contains `clients.csv` plus the `{ClientName}-{clientId}/{year}/{filename}` structure.
- Filename: `export-{YYYY-MM-DD}.zip`.

### US-4: Partial selection from filtered list
As an admin, I want to filter clients by name/email first, then select from the filtered results and export, without accidentally including clients outside my filter.

**Acceptance:**
- "Select all" checkbox selects all clients matching the current filter, across all pages (not just the current page, not all clients system-wide).
- Clicking "Select all" triggers a lightweight fetch of all matching client IDs so they can be held in frontend state.
- Export sends only the IDs of selected clients to the server.

## Decisions

1. **Max clients per export:** Hard cap at 200. Server returns HTTP 400 with message "Export limited to 200 clients at a time" if exceeded. UI disables the Export button and shows inline count when selection exceeds 200.
2. **ZIP folder naming:** Always `{ClientName}-{clientId}/` for every client — no collision detection needed, always unique.
3. **CSV columns:** Name, Email, Phone, Created Date, Linked Portal User Email (empty string if not linked). `adminId` excluded — not useful to the admin.
4. **Empty export:** If documents-only and no documents exist for any selected client in the chosen year, server returns HTTP 400 with message "No documents found for the selected clients and year." Frontend surfaces this as a snackbar error.
5. **Progress feedback:** Loading spinner on the Export button is sufficient. No server-sent progress.

## Referenced Capabilities

- `ClientRepository.findByAdminId(Long adminId)` — list admin's clients (scoped query)
- `ClientDocumentRepository.findByClientIdOrderByYearDescUploadedAtDesc(Long clientId)` — all docs for a client
- `ClientDocumentRepository.findByClientIdAndYear(Long clientId, int year)` — docs for a specific year
- `LocalStorageService.resolve(filePath)` — resolve stored file path to absolute `Path`
- `MeDocumentService.zipForYear()` — existing ZIP streaming pattern to follow
- `AdminClientsService` (frontend) — existing client list data source
- `AdminClientDocumentsService` (frontend) — existing document service
- Admin client list component at `frontend/src/app/features/admin/clients/admin-clients.component.ts`
