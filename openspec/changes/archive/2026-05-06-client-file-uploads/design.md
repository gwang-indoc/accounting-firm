## Context

The application currently has only a `users` table for login accounts (accountants, assistants, future client logins). There is no concept of a "client" as a business entity, and no mechanism for storing or retrieving client documents.

Accountants and assistants need to upload documents (tax returns, W-2s, receipts, etc.) on behalf of clients, organised by client and tax year. The hosting environment is a self-owned server — no cloud storage is available.

Reference: `docs/superpowers/specs/2026-05-06-client-file-uploads-design.md`

## Goals / Non-Goals

**Goals:**
- Introduce a `clients` table separate from `users`
- Store uploaded files on local disk organised by `clientId/year/filename`
- Store file metadata in PostgreSQL
- Allow same-name file to overwrite the previous version
- Make upload limits (size, filename length, blocked extensions) configurable without redeployment

**Non-Goals:**
- No frontend UI (API-only in this change)
- No cloud storage
- No client login wiring (FK reserved but not used)
- No virus scanning or content inspection
- No file versioning

## Decisions

### Decision 1: Separate `clients` table, not a role on `users`

**Choice:** New `clients` table with an optional `user_id` FK to `users`.

**Rationale:** Clients are business entities the firm manages. They need their own attributes (phone, tax info, etc.) and may exist in the system before they ever get a login. Conflating them with `users` via a role would make querying documents awkward and would require a migration later when client login is introduced.

**Alternative considered:** Add `role = 'CLIENT'` to `users` and use `users.id` as the client identifier. Rejected: mixes identity (login) with business entity (client record); no clean place to store client-specific fields.

---

### Decision 2: Local filesystem storage, layered service

**Choice:** `LocalStorageService` handles disk I/O only. `DocumentService` orchestrates validation + storage + DB.

**Rationale:** Clean separation makes each layer independently testable. `LocalStorageService` can be tested with `@TempDir`; `DocumentService` can be unit-tested with a mocked storage layer. Extraction to an interface (for future S3 swap) takes minutes if needed.

**Alternative considered:** Single `DocumentService` doing everything. Rejected: harder to test disk logic; mixes concerns.

**Alternative considered:** `StorageService` interface + `LocalStorageService` impl from day one. Rejected: premature abstraction — the user has confirmed local disk is the only target.

---

### Decision 3: Same filename = overwrite (upsert)

**Choice:** On upload, if `(client_id, year, filename)` already exists, overwrite the file on disk and update the DB row (size, mime type, uploaded_by, uploaded_at). A `UNIQUE (client_id, year, filename)` constraint enforces one record per slot.

**Rationale:** Simplest model for an accounting context — the latest version of a document is what matters. No versioning complexity.

**Alternative considered:** Reject duplicates with a 409 Conflict. Rejected: accountants commonly re-upload corrected files.

**Alternative considered:** Keep old file and create a new record. Rejected: introduces versioning complexity not requested.

---

### Decision 4: Configuration in `application.yml` with env var overrides

**Choice:** All limits in `application.yml` under `app.storage.*`, with `${ENV_VAR:default}` syntax. A single `StorageProperties` `@ConfigurationProperties` record binds them.

**Rationale:** `upload-dir` is a path (env var override natural for deployment). Limits (size, filename length, blocked extensions) have sensible defaults but ops may tune without redeployment.

**Alternative considered:** Hardcode limits in code. Rejected: limits need to be tunable per deployment without a code change.

---

### Decision 5: Directory structure `clients/{clientId}/{year}/filename`

**Choice:** Use numeric `clientId` as the directory name, not client name or slug.

**Rationale:** IDs are stable; names can change. Filesystem paths derived from mutable data require directory renames on update. The DB is the source of truth for human-readable names.

## Risks / Trade-offs

- **Disk fills up** → No quota enforcement per client. Mitigation: monitor disk usage at the OS level; a per-client quota can be added later.
- **Concurrent overwrites** → Two users uploading the same file simultaneously could corrupt it. Mitigation: acceptable at this scale; a file lock or DB-level advisory lock can be added if needed.
- **Upload directory missing on startup** → Service will fail at first write. Mitigation: `LocalStorageService` creates directories on demand (`Files.createDirectories`); startup health check can be added later.
- **Blocked extensions list** → Only extension-based checking; a renamed `.exe` → `.pdf` passes. Mitigation: out of scope for now; content-type inspection can be layered in later.

## Migration Plan

1. Apply Flyway migration V5 (`CREATE TABLE clients`)
2. Apply Flyway migration V6 (`CREATE TABLE client_documents`)
3. Deploy updated `application.yml` with `app.storage.*` block
4. Set `UPLOAD_DIR` in `.env` on the server and create the directory with appropriate permissions
5. No rollback complexity — new tables, new endpoints. Dropping V5/V6 reverts cleanly.

## Open Questions

_(none — all decisions made during brainstorming session on 2026-05-06)_
