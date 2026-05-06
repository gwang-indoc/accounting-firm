# Client File Uploads — Design Spec

**Date:** 2026-05-06

## Overview

Allow accountants and assistants to upload documents on behalf of clients. Files are stored on the local filesystem, organised by client and tax year. Metadata is stored in PostgreSQL. Upload limits and blocked extensions are configurable via environment variables.

---

## Data Model

### `clients` table (new)

Separate from `users`. Represents the firm's clients. An optional `user_id` FK links a client to a login account when client login is introduced in the future.

```sql
id          BIGSERIAL    PRIMARY KEY
user_id     BIGINT       REFERENCES users(id)   -- nullable; reserved for future client login
name        VARCHAR(255) NOT NULL
email       VARCHAR(255)
phone       VARCHAR(50)
created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
```

### `client_documents` table (new)

Stores file metadata. The combination of `(client_id, year, filename)` is unique — uploading a file with the same name for the same client/year overwrites the existing record.

```sql
id          BIGSERIAL    PRIMARY KEY
client_id   BIGINT       NOT NULL REFERENCES clients(id)
year        SMALLINT     NOT NULL
filename    VARCHAR(255) NOT NULL
file_path   VARCHAR(500) NOT NULL   -- relative path under upload-dir, e.g. clients/42/2025/tax-return.pdf
mime_type   VARCHAR(127)
size_bytes  BIGINT
uploaded_by BIGINT       NOT NULL REFERENCES users(id)
uploaded_at TIMESTAMP    NOT NULL DEFAULT NOW()
UNIQUE (client_id, year, filename)
```

---

## File Storage

Files are stored on the local filesystem under a configurable base directory. No cloud storage is used.

**Directory structure:**
```
$UPLOAD_DIR/
  clients/
    {clientId}/
      {year}/
        filename.pdf
        filename.xlsx
```

**Overwrite behaviour:** if a file with the same name already exists for the same client and year, the old file on disk is overwritten and the `client_documents` DB row is updated (size, mime type, uploaded_by, uploaded_at).

---

## Configuration

All limits live in `application.yml` with env var overrides. No additional yml profiles are created.

```yaml
app:
  storage:
    upload-dir: ${UPLOAD_DIR:./uploads}
    max-file-size-mb: ${UPLOAD_MAX_FILE_SIZE_MB:10}
    max-filename-length: ${UPLOAD_MAX_FILENAME_LENGTH:100}
    blocked-extensions: ${BLOCKED_EXTENSIONS:exe,js}
```

Spring Boot's multipart limit is also set to match `max-file-size-mb`:
```yaml
spring:
  servlet:
    multipart:
      max-file-size: ${UPLOAD_MAX_FILE_SIZE_MB:10}MB
      max-request-size: ${UPLOAD_MAX_FILE_SIZE_MB:10}MB
```

A `StorageProperties` `@ConfigurationProperties` record binds all `app.storage.*` values.

**.env.example** (committed to repo):
```
UPLOAD_DIR=/var/accounting-firm/uploads
UPLOAD_MAX_FILE_SIZE_MB=10
UPLOAD_MAX_FILENAME_LENGTH=100
BLOCKED_EXTENSIONS=exe,js
```

---

## Service Layer (Layered — Option B)

### `LocalStorageService`
Responsible only for disk I/O:
- `store(clientId, year, filename, inputStream)` — writes file to correct path, creates directories if needed
- `delete(filePath)` — removes file from disk
- `resolve(filePath)` — returns a `Path` for serving the file

### `DocumentService`
Orchestrates the upload flow:
1. Validate filename length against `max-filename-length`
2. Validate file extension against `blocked-extensions`
3. Validate file size against `max-file-size-mb`
4. Call `LocalStorageService.store()`
5. Upsert `client_documents` row (insert or update on conflict)

### `ClientService`
CRUD for the `clients` table (create, read, list). Used by the document API to verify a client exists before accepting an upload.

---

## API Endpoints

All endpoints are under `/api` and require authentication (JWT cookie).

### Client CRUD

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/clients` | Create a client |
| `GET` | `/api/clients` | List all clients |
| `GET` | `/api/clients/{clientId}` | Get a single client |

**Create request body:**
```json
{ "name": "John Doe", "email": "john@example.com", "phone": "555-1234" }
```

### Document Management

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/clients/{clientId}/documents?year={year}` | Upload a file |
| `GET` | `/api/clients/{clientId}/documents?year={year}` | List documents for a client/year |
| `GET` | `/api/clients/{clientId}/documents/{docId}/download` | Download a file |
| `DELETE` | `/api/clients/{clientId}/documents/{docId}` | Delete a document |

**Upload request:** `multipart/form-data` with a single `file` part.

**List response:**
```json
[
  {
    "id": 1,
    "filename": "tax-return.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 204800,
    "uploadedAt": "2025-03-01T10:00:00"
  }
]
```

**Download response:** file bytes with `Content-Disposition: attachment; filename="tax-return.pdf"`.

---

## Validation & Error Handling

| Condition | HTTP Status |
|-----------|-------------|
| Blocked file extension | `400 Bad Request` |
| Filename too long | `400 Bad Request` |
| File too large (service check) | `400 Bad Request` |
| File too large (multipart limit) | `413 Payload Too Large` |
| Client not found | `404 Not Found` |
| Document not found | `404 Not Found` |

---

## Package Structure

Following the existing `com.gwhaitech.accountingfirm` pattern:

```
com.gwhaitech.accountingfirm
  client/
    controller/  ClientController, DocumentController
    domain/      Client, ClientDocument, ClientRepository, ClientDocumentRepository
    dto/         ClientDto, DocumentDto, DocumentUploadResponse
    service/     ClientService, DocumentService
  storage/
    LocalStorageService
    StorageProperties
```

---

## Testing

- `@DataJpaTest` for `ClientRepository` and `ClientDocumentRepository`
- `@WebMvcTest` for `DocumentController` — mock `DocumentService`
- Unit tests for `DocumentService` — mock `LocalStorageService`, verify validation logic
- Unit tests for `LocalStorageService` — use a temp directory (`@TempDir`)
- Playwright E2E test covering: upload a file, list it, download it, delete it
