## 1. Backend — Export service and endpoint

### Contract
- **Spec**:
  - The system SHALL expose `POST /api/clients/export` accepting a JSON body with: `clientIds` (array of longs, required, 1–200 items), `includeMetadata` (boolean), `includeDocuments` (boolean), and `year` (integer or null). At least one of `includeMetadata` or `includeDocuments` SHALL be true.
  - The authenticated admin SHALL only be permitted to export clients they own — server returns `403 Forbidden` if any `clientIds` entry belongs to a different admin.
  - Exceeding 200 client IDs SHALL return `400 Bad Request` with message "Export limited to 200 clients at a time."
  - Metadata-only: SHALL return `200 OK` with `Content-Type: text/csv`, `Content-Disposition: attachment; filename="clients-export-{YYYY-MM-DD}.csv"`, and one data row per requested client with columns: Name, Email, Phone, Created Date, Linked Portal User Email (empty string if unlinked).
  - Documents-only: SHALL return `200 OK` with `Content-Type: application/zip`, `Content-Disposition: attachment; filename="documents-export-{YYYY-MM-DD}.zip"`, entries at `{ClientName}-{clientId}/{year}/{filename}`. Clients with no documents for the year SHALL be silently omitted. If no documents are found across all selected clients, SHALL return `400 Bad Request` with message "No documents found for the selected clients and year."
  - Combined: SHALL return a ZIP named `export-{YYYY-MM-DD}.zip` containing `clients.csv` at the root plus document entries.
  - The system SHALL stream ZIP content directly to the HTTP response using `ZipOutputStream` without buffering the entire ZIP in memory.
  - The system SHALL expose `GET /api/clients/ids?name=&email=` returning only the IDs of clients owned by the authenticated admin that match the filter (scoped to `admin_id`).
- **Runtime**: `cd backend && ./mvnw test -Dtest=AdminExportServiceTest,AdminExportControllerTest` → all tests pass, no regressions in existing backend tests
- **Code**:
  - D1: `POST /api/clients/export` handles all three modes; response type differs by mode
  - D2: New `AdminExportService` — reads `ClientRepository`, `ClientDocumentRepository`, `LocalStorageService`; do NOT bolt export logic onto `ClientService`
  - D3: Stream ZIP via `ZipOutputStream` directly onto `HttpServletResponse.getOutputStream()` — match pattern in `MeDocumentService.zipForYear()`
  - D5: CSV via `PrintWriter` with manual quoting — no new CSV library dependency
  - Risk: Sanitize client name for ZIP entry path (strip `:`, `*`, `?`, `\`, `/` etc.); log and skip missing files mid-stream rather than aborting
- **Threshold**: 80

- [x] 1.0 CONTRACT — write openspec/changes/admin-client-export/contracts/group-1.md with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [x] 1.1 RED — write `AdminExportServiceTest`: test that ownership validation throws 403 when any client ID belongs to another admin
- [x] 1.2 GREEN — create `AdminExportService` with `validateOwnership(adminId, clientIds)` method that queries `ClientRepository` and throws `AccessDeniedException` for unowned IDs
- [x] 1.3 RED — write test: >200 client IDs returns 400 with correct message
- [x] 1.4 GREEN — add cap validation in `AdminExportService.validateRequest()` before ownership check
- [x] 1.5 RED — write `AdminExportServiceTest`: metadata-only export returns correct CSV bytes (header row + data rows, linked user email, empty string for unlinked)
- [x] 1.6 GREEN — implement `AdminExportService.buildCsv(List<Client>)` using `PrintWriter` with RFC 4180 quoting; resolve linked user emails from `UserRepository`
- [x] 1.7 RED — write test: documents-only export for a specific year produces correct ZIP entries at `{ClientName}-{clientId}/{year}/{filename}`; client with no docs for year is omitted
- [x] 1.8 GREEN — implement `AdminExportService.streamDocumentZip(clientIds, year, OutputStream)` using `ZipOutputStream`; sanitize client name for path; skip missing files with a log warning
- [x] 1.9 RED — write test: documents-only with no documents found returns 400 with correct message
- [x] 1.10 GREEN — add empty-result guard in `AdminExportService`: count total entries before/during streaming; return 400 if none
- [x] 1.11 RED — write test: combined export ZIP contains `clients.csv` at root and document entries
- [x] 1.12 GREEN — implement `AdminExportService.streamCombinedZip(clientIds, year, OutputStream)` — first entry is `clients.csv`, then document entries
- [x] 1.13 RED — write `AdminExportControllerTest` (`@WebMvcTest`): POST `/api/clients/export` with valid body returns expected Content-Type and Content-Disposition; test each mode
- [x] 1.14 GREEN — create `AdminExportController` with `POST /api/clients/export` delegating to `AdminExportService`; set response headers before streaming
- [x] 1.15 RED — write `AdminClientsControllerTest`: `GET /api/clients/ids?name=&email=` returns only IDs owned by authenticated admin
- [x] 1.16 GREEN — add `GET /api/clients/ids` method to `ClientController` (or `AdminExportController`); reuses `ClientRepository.findByAdminId()` with optional filter
- [x] 1.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-1.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 2. Frontend — Multi-select, export toolbar, and dialog

### Contract
- **Spec**:
  - The admin client list UI SHALL display a checkbox column allowing selection of individual clients.
  - A "Select all" control SHALL select all clients matching the current name/email filter across all pages by fetching all client IDs matching the filter via a lightweight request.
  - When the name or email filter changes, the current selection SHALL be cleared.
  - When ≥1 client is selected, the admin client list SHALL display an export toolbar showing the count of selected clients and an "Export" button.
  - The export dialog SHALL present: checkboxes for "Include client metadata" and "Include documents" (both checked by default), a year selector (visible only when "Include documents" is checked, defaulting to "All years"), and "Cancel" / "Export" actions.
  - The Export button SHALL be disabled and show a loading indicator while the request is in flight.
  - On success, the browser SHALL download the file with the server-provided filename.
  - On 400 or 403 from the server, the frontend SHALL display the error message in a snackbar.
  - When the selection reaches 200, attempting to add a 201st client SHALL show an inline message "Export limited to 200 clients at a time" and not add the client.
  - The export toolbar SHALL include a "Clear" button (`data-testid="deselect-all-btn"`) that deselects all clients and dismisses any cap message.
- **Runtime**: `cd frontend && npx ng test --no-watch --include='**/admin-clients/**'` → all tests pass including new multi-select and export dialog specs
- **Code**:
  - D4: "Select all" calls `GET /api/clients/ids?name=&email=` (new lightweight endpoint) — one round-trip, merges IDs into selection signal
  - D6: Export uses `HttpClient` with `responseType: 'blob'`, creates `URL.createObjectURL`, programmatically clicks `<a>` — do NOT use `window.location.href` (can't POST with it)
  - D7: Selection cleared automatically when filter changes — Angular effect watching filter signals
- **Threshold**: 80

- [x] 2.0 CONTRACT — write openspec/changes/admin-client-export/contracts/group-2.md with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [x] 2.1 RED — write `admin-clients.component.spec.ts` tests: checkbox selects individual client; "Select all" fetches IDs endpoint and merges; filter change clears selection; 201st client shows cap message
- [x] 2.2 GREEN — add `selectedClientIds = signal<Set<number>>(new Set())` to `AdminClientsComponent`; add checkbox column to template; wire "Select all" to call `AdminExportService.getAllClientIds(name, email)`; add filter-change effect that clears selection; enforce 200-client cap
- [x] 2.3 RED — write tests for export toolbar: hidden with 0 selected; visible with ≥1 selected showing correct count
- [x] 2.4 GREEN — add export toolbar to `admin-clients.component.html` using Angular Material toolbar; conditionally visible via `selectedClientIds().size > 0`
- [x] 2.5 RED — write `admin-export-dialog.component.spec.ts`: dialog shows both checkboxes checked by default; year selector hidden when "Include documents" unchecked; "Cancel" closes dialog; "Export" emits config
- [x] 2.6 GREEN — create `AdminExportDialogComponent` (standalone, Angular Material dialog); fields: `includeMetadata` (default true), `includeDocuments` (default true), `year` (default null = all years); year selector shows last 10 years + "All years" option
- [x] 2.7 RED — write `admin-export.service.spec.ts`: `export()` posts to `/api/clients/export` with `responseType: 'blob'`; triggers download with server filename from Content-Disposition; 400 error surfaces error message string
- [x] 2.8 GREEN — create `AdminExportService` with `export(clientIds, options)` method: POST with `responseType: 'blob'`, parse Content-Disposition for filename, create blob URL, click anchor, revoke URL; on error decode blob to JSON and rethrow message
- [x] 2.9 GREEN — wire "Export" button in toolbar to open `AdminExportDialogComponent`; on dialog confirm call `AdminExportService.export()`; show loading state on button; on error show MatSnackBar with error message
- [x] 2.F1 FIX — Add `isExporting` signal to `AdminClientsComponent`; set true before calling `downloadExport()`, false on complete/error; bind Export button `[disabled]="isExporting()"` and add loading spinner using `<mat-spinner>` or progress indicator
- [x] 2.F2 FIX — Update error handler in `openExportDialog()` to extract and display actual server error message: intercept `HttpErrorResponse.error`, parse JSON body for message field, display in snackBar instead of generic "Export failed" message
- [x] 2.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-2.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 3. E2E + verification

- [x] 3.1 Write Playwright e2e test in `e2e/` covering: admin logs in → navigates to client list → selects 1–2 clients → opens export dialog → exports metadata-only → verifies CSV file is downloaded (check filename via download event); and documents export triggers ZIP download
- [x] 3.2 Run backend baseline: `cd backend && ./mvnw test` → no regressions (3 pre-existing ContactSecurityTest/ContactIntegrationTest errors, confirmed pre-existing)
- [x] 3.3 Run frontend baseline: `cd frontend && npx ng test --no-watch` → no regressions (14 pre-existing failing files, same as baseline)
- [x] 3.4 Run e2e suite: `cd e2e && npx playwright test admin-client-export.spec.ts` → 6/6 pass
- [x] 3.5 Run /security-review on the branch diff; address Critical/High/Medium findings before proceeding (no C/H/M findings; two Low findings, advisory only)
- [x] 3.6 Run superpowers:verification-before-completion (backend 20/20, frontend 36/38 with 2 pre-existing, e2e 6/6)
- [x] 3.7 Update dev log: docs/log/YYYY-MM-DD.md with summary of this change
