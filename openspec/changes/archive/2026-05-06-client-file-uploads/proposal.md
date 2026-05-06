## Why

The firm needs to store and manage documents (tax returns, W-2s, receipts, etc.) on behalf of its clients, organised by client and tax year. Currently there is no mechanism for accountants or assistants to upload, retrieve, or delete client files within the application.

## What Changes

- New `clients` table to represent the firm's clients (separate from login accounts in `users`)
- New `client_documents` table to store file metadata (filename, size, mime type, year, uploader)
- Local filesystem storage under a configurable base directory, organised as `clients/{clientId}/{year}/filename`
- Upload validation: blocked file extensions, max file size, max filename length — all configurable via `application.yml` / env vars
- Same filename for the same client/year overwrites the existing file and updates the DB row
- REST API for client CRUD and document upload/list/download/delete
- `StorageProperties` `@ConfigurationProperties` binding for all storage-related config

## Capabilities

### New Capabilities

- `client-management`: Create, list, and retrieve clients. Clients are distinct from login accounts (`users`). An optional `user_id` FK is reserved for future client login.
- `client-document-uploads`: Upload, list, download, and delete documents for a client and year. Files stored on local filesystem; metadata in PostgreSQL. Validation enforced on extension, size, and filename length.

### Modified Capabilities

_(none — no existing spec-level requirements are changing)_

## Impact

- **Backend:** New Flyway migrations (V5 `clients`, V6 `client_documents`). New packages: `client/` (controller, domain, dto, service) and `storage/` (LocalStorageService, StorageProperties).
- **Config:** `application.yml` gains `app.storage.*` properties; `spring.servlet.multipart` limits wired to same env var.
- **Database:** Two new tables with FK to `users`.
- **No frontend changes** in this change — API-only.
- **Brainstorming spec:** `docs/superpowers/specs/2026-05-06-client-file-uploads-design.md`

## Non-Goals

- No frontend UI for file management (future change)
- No cloud storage (S3, GCS) — local filesystem only
- No client login in this change (`user_id` FK is reserved but not wired)
- No virus scanning or content inspection
- No file versioning beyond simple overwrite
