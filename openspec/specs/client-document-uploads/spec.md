## ADDED Requirements

### Requirement: Upload a document
The system SHALL allow an authenticated user to upload a file for a specific client and year via `POST /api/clients/{clientId}/documents?year={year}` as `multipart/form-data` with a `file` part. If a document with the same filename already exists for that client and year, it SHALL be overwritten (file on disk replaced, DB row updated).

#### Scenario: Successful upload (new file)
- **WHEN** an authenticated user uploads a valid file for an existing client and year
- **THEN** the system stores the file at `$UPLOAD_DIR/clients/{clientId}/{year}/{filename}`, creates a `client_documents` record, and returns `201 Created` with document metadata

#### Scenario: Successful upload (overwrite)
- **WHEN** an authenticated user uploads a file whose name matches an existing document for the same client and year
- **THEN** the system overwrites the file on disk, updates the `client_documents` record, and returns `200 OK` with updated metadata

#### Scenario: Client not found
- **WHEN** an authenticated user uploads a file for a non-existent client ID
- **THEN** the system returns `404 Not Found`

#### Scenario: Blocked file extension
- **WHEN** an authenticated user uploads a file whose extension is in the `blocked-extensions` list (e.g., `.exe`, `.js`)
- **THEN** the system returns `400 Bad Request` without writing any file

#### Scenario: Filename too long
- **WHEN** an authenticated user uploads a file whose original filename exceeds `max-filename-length` characters
- **THEN** the system returns `400 Bad Request` without writing any file

#### Scenario: File too large
- **WHEN** an authenticated user uploads a file whose size exceeds `max-file-size-mb` megabytes
- **THEN** the system returns `400 Bad Request` (or `413 Payload Too Large` if rejected at the multipart layer)

---

### Requirement: List documents for a client and year
The system SHALL allow an authenticated user to list all documents for a specific client and year via `GET /api/clients/{clientId}/documents?year={year}`.

#### Scenario: Documents exist
- **WHEN** an authenticated user requests documents for a client and year that has uploads
- **THEN** the system returns `200 OK` with a JSON array of document metadata (id, filename, mimeType, sizeBytes, uploadedAt)

#### Scenario: No documents
- **WHEN** an authenticated user requests documents for a client and year with no uploads
- **THEN** the system returns `200 OK` with an empty JSON array

#### Scenario: Client not found
- **WHEN** an authenticated user requests documents for a non-existent client ID
- **THEN** the system returns `404 Not Found`

---

### Requirement: Download a document
The system SHALL allow an authenticated user to download a specific document by its ID via `GET /api/clients/{clientId}/documents/{docId}/download`.

#### Scenario: Successful download
- **WHEN** an authenticated user requests a document that exists
- **THEN** the system returns `200 OK` with the file bytes and `Content-Disposition: attachment; filename="{filename}"`

#### Scenario: Document not found
- **WHEN** an authenticated user requests a document ID that does not exist
- **THEN** the system returns `404 Not Found`

---

### Requirement: Delete a document
The system SHALL allow an authenticated user to delete a specific document by its ID via `DELETE /api/clients/{clientId}/documents/{docId}`. Both the file on disk and the `client_documents` record SHALL be removed.

#### Scenario: Successful delete
- **WHEN** an authenticated user deletes an existing document
- **THEN** the system removes the file from disk, deletes the `client_documents` record, and returns `204 No Content`

#### Scenario: Document not found
- **WHEN** an authenticated user deletes a document ID that does not exist
- **THEN** the system returns `404 Not Found`

---

### Requirement: Upload validation is configurable
The system SHALL read upload constraints from `application.yml` under `app.storage.*` and SHALL support overriding them via environment variables without redeployment.

#### Scenario: Blocked extensions list is configurable
- **WHEN** the `BLOCKED_EXTENSIONS` environment variable is set to a comma-separated list
- **THEN** the system blocks uploads of files with any of those extensions

#### Scenario: File size limit is configurable
- **WHEN** the `UPLOAD_MAX_FILE_SIZE_MB` environment variable is set
- **THEN** the system rejects files larger than that value

#### Scenario: Filename length limit is configurable
- **WHEN** the `UPLOAD_MAX_FILENAME_LENGTH` environment variable is set
- **THEN** the system rejects filenames longer than that value
