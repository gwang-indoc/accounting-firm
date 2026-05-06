Invoke superpowers:subagent-driven-development to dispatch groups 1, 2 in parallel; one subagent per group.

## 1. Configuration & Storage Layer

- [x] 1.1 Update `backend/src/main/resources/application.yml`: add `app.storage.*` block (`upload-dir`, `max-file-size-mb`, `max-filename-length`, `blocked-extensions` with `${ENV_VAR:default}` syntax); add `spring.servlet.multipart` size limits wired to `UPLOAD_MAX_FILE_SIZE_MB`; add all four env var entries to `.env.example`
- [x] 1.2 Create `StorageProperties` `@ConfigurationProperties(prefix = "app.storage")` record (fields: `uploadDir`, `maxFileSizeMb`, `maxFilenameLength`, `blockedExtensions`); register with `@EnableConfigurationProperties` on `AccountingFirmApplication`
- [ ] 1.3 RED — write failing unit test for `LocalStorageService` under `storage/` package: `store()` creates file at `clients/{clientId}/{year}/{filename}` under a `@TempDir` base; `delete()` removes the file; `resolve()` returns correct `Path`; run test, confirm FAILURE; paste key failure lines into dev log entry
- [ ] 1.4 GREEN — implement `LocalStorageService`: `store(long clientId, int year, String filename, InputStream in)`, `delete(String filePath)`, `resolve(String filePath)`; use `Files.createDirectories` for parent dirs; run test, confirm PASS; commit test + impl together
- [ ] 1.Z Run superpowers:requesting-code-review on the diff for group 1; address CRITICAL/HIGH findings before moving on
- [ ] 1.Z+1 Update `docs/log/2026-05-06.md` — add entry for group 1 with commit hash, feature bullets, code review findings, test count, and TDD evidence (paste RED failure lines for `LocalStorageService` test)

## 2. Client Management

- [ ] 2.1 Write Flyway migration `V5__create_clients.sql`: `CREATE TABLE clients (id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id), name VARCHAR(255) NOT NULL, email VARCHAR(255), phone VARCHAR(50), created_at TIMESTAMP NOT NULL DEFAULT NOW())`
- [ ] 2.2 RED — `@DataJpaTest` for `Client` entity: persist a client with name, email, phone; assert all fields round-trip; run test, confirm FAILURE (entity does not exist yet); paste key failure lines into dev log entry
- [ ] 2.3 GREEN — create `Client @Entity` + `ClientRepository extends JpaRepository<Client, Long>`; run test, confirm PASS; commit entity + repository + test together
- [ ] 2.4 RED — unit test `ClientService`: `createClient()` returns `ClientDto` with all fields; `findAll()` returns list; `findById()` returns dto for existing id; `findById()` throws `ClientNotFoundException` for unknown id; run test, confirm FAILURE
- [ ] 2.5 GREEN — implement `ClientService` (inject `ClientRepository`); add `ClientDto` record; add `ClientNotFoundException`; run test, confirm PASS; commit
- [ ] 2.6 RED — `@WebMvcTest ClientController`: `POST /api/clients` with valid body returns `201` + `ClientDto` JSON; `POST /api/clients` without name returns `400`; `GET /api/clients` returns `200` + array; `GET /api/clients/{id}` for existing id returns `200`; `GET /api/clients/999` returns `404`; run test, confirm FAILURE
- [ ] 2.7 GREEN — implement `ClientController` + `CreateClientRequest` DTO with `@Valid @NotBlank name`; add `@ExceptionHandler` for `ClientNotFoundException` → `404`; run test, confirm PASS; commit
- [ ] 2.Z Run superpowers:requesting-code-review on the diff for group 2; address CRITICAL/HIGH findings before moving on
- [ ] 2.Z+1 Update `docs/log/2026-05-06.md` — add entry for group 2 with commit hash, feature bullets, code review findings, test count, and TDD evidence (paste RED failure lines for each new test)

## 3. Document Foundation (Migration, Entity, Repository)

- [ ] 3.1 Write Flyway migration `V6__create_client_documents.sql`: `CREATE TABLE client_documents (id BIGSERIAL PRIMARY KEY, client_id BIGINT NOT NULL REFERENCES clients(id), year SMALLINT NOT NULL, filename VARCHAR(255) NOT NULL, file_path VARCHAR(500) NOT NULL, mime_type VARCHAR(127), size_bytes BIGINT, uploaded_by BIGINT NOT NULL REFERENCES users(id), uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE (client_id, year, filename))`
- [ ] 3.2 RED — `@DataJpaTest` for `ClientDocument`: persist a document linked to a saved client; assert all fields persist; attempt a second insert with same `(client_id, year, filename)` and assert constraint violation; run test, confirm FAILURE
- [ ] 3.3 GREEN — create `ClientDocument @Entity` + `ClientDocumentRepository` with custom finders: `findByClientIdAndYear(Long clientId, int year)`, `findByClientIdAndYearAndFilename(Long clientId, int year, String filename)`; run test, confirm PASS; commit
- [ ] 3.Z Run superpowers:requesting-code-review on the diff for group 3; address CRITICAL/HIGH findings before moving on
- [ ] 3.Z+1 Update `docs/log/2026-05-06.md` — add entry for group 3 with commit hash, feature bullets, code review findings, test count, and TDD evidence (paste RED failure lines)

## 4. Document Service & Controller

- [ ] 4.1 RED — unit test `DocumentService` (mock `LocalStorageService`, `ClientDocumentRepository`, `ClientRepository`, `StorageProperties`):
  - `upload()` with a new file: calls `store()` and saves a new `ClientDocument` record
  - `upload()` with same filename: calls `store()` again and updates the existing record
  - `upload()` with blocked extension (e.g. `.exe`): throws `FileValidationException` (400), `store()` never called
  - `upload()` with filename length > `maxFilenameLength`: throws `FileValidationException` (400)
  - `upload()` with size > `maxFileSizeMb`: throws `FileValidationException` (400)
  - `upload()` for non-existent client: throws `ClientNotFoundException` (404)
  - `listDocuments()` returns all docs for client+year
  - `deleteDocument()` calls `delete()` and removes DB record
  - `deleteDocument()` for unknown id: throws `DocumentNotFoundException` (404)
  - Run test, confirm FAILURE; paste key failure lines into dev log
- [ ] 4.2 GREEN — implement `DocumentService` (inject `LocalStorageService`, `ClientDocumentRepository`, `ClientRepository`, `StorageProperties`); implement upsert using `findByClientIdAndYearAndFilename` + save; add `FileValidationException` and `DocumentNotFoundException`; run test, confirm PASS; commit
- [ ] 4.3 RED — `@WebMvcTest DocumentController` (mock `DocumentService`):
  - `POST /api/clients/{id}/documents?year=2025` with multipart file → new file returns `201` + metadata JSON
  - same upload (overwrite) → returns `200` + updated metadata
  - blocked extension → `400`
  - filename too long → `400`
  - file too large → `400`
  - client not found → `404`
  - `GET /api/clients/{id}/documents?year=2025` → `200` + array
  - `GET /api/clients/999/documents?year=2025` → `404`
  - `GET /api/clients/{id}/documents/{docId}/download` → `200` with `Content-Disposition: attachment`
  - `DELETE /api/clients/{id}/documents/{docId}` → `204`
  - `DELETE /api/clients/{id}/documents/999` → `404`
  - Run test, confirm FAILURE
- [ ] 4.4 GREEN — implement `DocumentController` + `DocumentDto` (id, filename, mimeType, sizeBytes, uploadedAt) + `DocumentUploadResponse`; add `@ExceptionHandler` for `FileValidationException` → `400`, `DocumentNotFoundException` → `404`; run test, confirm PASS; commit
- [ ] 4.Z Run superpowers:requesting-code-review on the diff for group 4; address CRITICAL/HIGH findings before moving on
- [ ] 4.Z+1 Update `docs/log/2026-05-06.md` — add entry for group 4 with commit hash, feature bullets, code review findings, test count, and TDD evidence (paste RED failure lines for each new test)

## 5. Final Verification

- [ ] 5.1 Run superpowers:verification-before-completion: `cd backend && ./mvnw test`; grep codebase for `System.out.println` and `console.log`; review full diff for stray debug code or missed requirements from specs
- [ ] 5.Z Run superpowers:requesting-code-review on the full change diff
- [ ] 5.Z+1 Update `docs/log/2026-05-06.md` — final entry with all commit hashes, complete feature summary, and any outstanding items
