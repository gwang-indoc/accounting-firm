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
