# Document Management API

> Sources: Project OpenSpec, 2026-05-21
> Raw: [openspec-client-document-uploads](../../raw/api/openspec-client-document-uploads.md)

## Overview

Authenticated users can upload, list, download, and delete documents scoped to a client and tax year. Files are stored on disk under `$UPLOAD_DIR/clients/{clientId}/{year}/{filename}`. The `client_documents` table tracks metadata. Upload constraints are configurable via `application.yml` and overridable by environment variables without redeployment.

## Endpoints

### Upload Document

`POST /api/clients/{clientId}/documents?year={year}` — `multipart/form-data`, `file` part.

| Condition | Response |
|---|---|
| New file | 201 — creates `client_documents` record, returns metadata |
| Same filename exists for client + year | 200 — overwrites file on disk, updates record |
| Client not found | 404 |
| Blocked extension (e.g. `.exe`, `.js`) | 400 |
| Filename exceeds `max-filename-length` | 400 |
| File exceeds `max-file-size-mb` MB | 400 (or 413 at multipart layer) |

Document metadata fields: `id`, `filename`, `mimeType`, `sizeBytes`, `uploadedAt`.

### List Documents

`GET /api/clients/{clientId}/documents?year={year}`

Returns 200 with JSON array of document metadata (empty array when none). Returns 404 if client not found.

### Download Document

`GET /api/clients/{clientId}/documents/{docId}/download`

Returns 200 with file bytes and `Content-Disposition: attachment; filename="{filename}"`. Returns 404 if document not found.

### Delete Document

`DELETE /api/clients/{clientId}/documents/{docId}`

Removes file from disk and deletes `client_documents` record. Returns 204 on success, 404 if not found.

## Configurable Constraints

Configuration in `application.yml` under `app.storage.*`:

| Property | Env Var Override |
|---|---|
| Blocked extensions list | `BLOCKED_EXTENSIONS` (comma-separated) |
| Max file size (MB) | `UPLOAD_MAX_FILE_SIZE_MB` |
| Max filename length | `UPLOAD_MAX_FILENAME_LENGTH` |

## See Also

- [Client Management API](client-management.md)
- [Contact Form](contact-form.md)
