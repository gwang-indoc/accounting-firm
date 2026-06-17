## Context

Admins manage clients and documents through the existing admin portal. Client data lives in the `clients` table (owned via `admin_id`); documents live in `client_documents` with files on local disk at `$UPLOAD_DIR/clients/{clientId}/{year}/{filename}`. A ZIP export pattern already exists in `MeDocumentService.zipForYear()` for portal users. There is no bulk export path for admins today.

This change adds a new backend export endpoint and wires a multi-select + export dialog into the existing admin clients list component.

## Goals / Non-Goals

**Goals:**
- Admin can select 1–200 clients and download their metadata as CSV, their documents as ZIP, or both in one combined ZIP.
- Server enforces ownership: only the authenticated admin's own clients are exportable.
- ZIP streaming — no full in-memory accumulation.

**Non-Goals:**
- Async/background export jobs.
- Progress reporting beyond a loading spinner.
- Export from the per-client detail page.
- Message history or any other data type.

## Decisions

### D1: Single endpoint `POST /api/clients/export` returns either CSV or ZIP

**Decision:** One endpoint handles all three modes (metadata-only → CSV, docs-only → ZIP, both → ZIP). The response Content-Type and body differ by mode.

**Alternatives considered:**
- Separate endpoints (`/export/csv`, `/export/zip`) — cleaner REST surface but adds routing complexity and duplicates the ownership validation logic.
- Query-param-driven GET — can't send a body with a large list of IDs safely in a GET.

`POST` with a JSON body is the cleanest way to send a variable-length list of IDs with options.

---

### D2: AdminExportService — dedicated service, not bolted onto ClientService

**Decision:** New `AdminExportService` handles CSV building, ZIP streaming, and ownership validation. It reads from `ClientRepository`, `ClientDocumentRepository`, and `LocalStorageService`.

**Alternatives considered:**
- Adding methods to `ClientService` — avoids a new class but `ClientService` is already a CRUD service; export is a read-only reporting concern with different collaborators.

`AdminExportService` keeps the CRUD service clean and makes the export logic independently testable.

---

### D3: ZIP streaming via ZipOutputStream directly onto the HttpServletResponse OutputStream

**Decision:** Write ZIP entries directly to `response.getOutputStream()` inside the controller using `ZipOutputStream`. Follow the pattern in `MeDocumentService.zipForYear()`.

**Alternatives considered:**
- Build ZIP to a temp file then serve — simpler error handling but requires disk space proportional to the export size and adds latency before the download starts.
- Spring's `StreamingResponseBody` — cleaner Spring idiom, same effect. Either works; direct `HttpServletResponse` is what the existing code uses, so we match it.

---

### D4: Select-all-filtered uses a lightweight `GET /api/clients/ids` endpoint

**Decision:** When the admin clicks "Select all", the frontend calls a new `GET /api/clients/ids?name=...&email=...` endpoint that returns only `id[]` (no full client objects). The frontend merges these into its selection state.

**Alternatives considered:**
- Re-use the existing `GET /api/clients` paginated call, iterating all pages — works but is N round-trips and transfers full client objects.
- Server-side "select all by filter" flag in the export body — defers the ID resolution to the server; simpler frontend but harder to show the count in the UI before the dialog opens.

A dedicated IDs endpoint is one fast call, lets the UI show "127 clients selected" accurately, and keeps the export body simple.

---

### D5: CSV built with plain PrintWriter, no external library

**Decision:** CSV generation uses `PrintWriter` with manual quoting (wrap fields containing commas or quotes in double-quotes; escape embedded quotes as `""`). No Apache Commons CSV or OpenCSV dependency.

**Alternatives considered:**
- Apache Commons CSV — correct and well-tested quoting, but adds a dependency for a trivial use case. The field values here (name, email, phone, date) very rarely need quoting; manual quoting is safe and easy to test.

---

### D6: Frontend triggers download via Blob URL, not window.location.href

**Decision:** The Angular export service POSTs with `responseType: 'blob'`, then creates a temporary object URL (`URL.createObjectURL`) and programmatically clicks an `<a>` element to trigger the download.

**Alternatives considered:**
- `window.location.href` with a GET — can't send a POST body this way.
- Form submit — works but is awkward with Angular's HTTP interceptor (`withCredentials`).

Blob URL approach works with `withCredentials`, handles both CSV and ZIP responses, and allows reading the response body on error (parse JSON error from a blob).

---

### D7: Selection cleared on filter change

**Decision:** When the name or email filter changes, the active selection is cleared automatically.

**Rationale:** Keeping a stale selection after a filter change is confusing — the selected rows may not be visible. Clear is the safest default; admin can re-select.

## Risks / Trade-offs

- **[Large export latency]** → Streaming starts immediately, so the browser shows download progress. However, reading 200 clients × N documents from disk is still slow. Mitigation: cap at 200 clients. Accept that large exports may take several seconds.
- **[Disk read errors mid-stream]** → If a file is missing from disk after the ZIP has started streaming, the ZIP will be truncated. Mitigation: log the error, continue with remaining files (skip the missing entry). The ZIP will be incomplete but not corrupt from the client's perspective.
- **[ClientName in ZIP path]** → Client names may contain characters that are valid in ZIP paths on some OS but not others (e.g., `:`, `*`, `?` on Windows). Mitigation: sanitize the name segment — strip or replace these characters before building the ZIP entry path.

## Migration Plan

- No DB migrations required (read-only).
- No environment variable changes.
- Deploy backend first (new endpoint is additive), then frontend. No rollback coordination needed — the endpoint is new, not modifying existing ones.

## Open Questions

None — all decisions resolved before tasks generation.
