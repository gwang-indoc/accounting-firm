---
Date: 2026-06-08
Change: file-upload-type-verification
Status: REVIEWED
---

# Requirements — File upload type verification

## Goals

- Reject uploaded files that are not in the explicitly allowed set (allowlist, not blocklist).
- Reject files whose declared MIME type does not match their extension.
- Reject files whose actual byte content does not match their declared type (polyglot / renamed file attack).
- Keep all validation in one place: `FileUploadValidator`.
- Remain configurable via env vars without code changes.

## Non-Goals

- Antivirus / malware scanning (separate concern, out of scope).
- Rate-limiting uploads (separate concern).
- Changes to frontend file picker `accept` attribute (already correct; cosmetic only).
- Translating server-side validation error messages (e.g. `FileValidationException` messages). The frontend already displays raw server messages for 400 errors — this is a pre-existing pattern. i18n of backend errors is a separate concern.
- Changes to storage path, DB schema, or download behaviour.
- Supporting additional file types beyond the current frontend allowlist.

## Constraints

- Must not break existing happy-path uploads of the allowed types.
- Must not pull in `tika-parsers` (the full heavyweight bundle). Use `tika-core` + `tika-parser-microsoft-module` only — the latter adds the OOXML detector without pulling in full document parsers.
- `MultipartFile.getInputStream()` is backed by a temp file in Spring — safe to open and read a prefix without consuming the upload stream for storage.
- XLSX and DOCX are ZIP-based. `tika-core` alone returns `application/zip` for these files; `tika-parser-microsoft-module` adds `OOXMLDetector` which inspects `[Content_Types].xml` inside the archive and returns the specific OOXML MIME type. Without this module a renamed plain `.zip` presented as `.xlsx` would pass Layer 3 — hence the module is required.
- CSV has no magic bytes; Tika detects it as `text/plain`. The allowlist map must accept `text/plain` as valid for `.csv`.

## Success Criteria

- `FileValidationException` is thrown (→ HTTP 400) when:
  - Extension is not in the allowlist.
  - File has no extension.
  - Declared Content-Type does not match the extension's expected MIME types.
  - Tika-detected type does not match the extension's expected MIME types.
- All existing tests still pass.
- New unit tests in `FileUploadValidatorTest` cover:
  - Each allowed extension with a matching real file fixture (happy path).
  - A renamed `.exe` file presented as `.pdf` (magic byte mismatch → rejected).
  - A plain `.zip` file presented as `.xlsx` (OOXML vs ZIP → rejected).
  - A file with no extension (rejected).
  - A file with a disallowed extension (rejected).
  - A `.csv` file (text/plain Tika result → accepted).

## User Stories

- **As a client uploading a document**, if I accidentally select a disallowed file type (e.g. `.zip`, `.exe`), I see a clear error message: `"File type not allowed. Allowed types: pdf, jpg, jpeg, png, xlsx, xls, csv, doc, docx."`
- **As an attacker** renaming `evil.exe` to `evil.pdf` and uploading it, the server rejects the upload because Tika detects the actual content type does not match `application/pdf`.
- **As a staff member** uploading a legitimate `.xlsx` report, the upload succeeds without visible change to the existing workflow.

## Open Questions

- None — design decisions resolved in exploration.

## Referenced Capabilities

- `FileUploadValidator` — `backend/src/main/java/com/gwhaitech/accountingfirm/storage/FileUploadValidator.java`
- `StorageProperties` — `backend/src/main/java/com/gwhaitech/accountingfirm/storage/StorageProperties.java`
- `application.yml` — `backend/src/main/resources/application.yml`
- `pom.xml` — `backend/pom.xml`

---

## Design

### Layer 1 — Extension allowlist

Replace `blockedExtensions` with `allowedExtensions` in `StorageProperties`.

```
StorageProperties record:
  - blockedExtensions  (removed)
  + allowedExtensions  List<String>

application.yml default:
  allowed-extensions: pdf,jpg,jpeg,png,xlsx,xls,csv,doc,docx

Env var:
  ALLOWED_EXTENSIONS (replaces BLOCKED_EXTENSIONS)
```

Validation: extract extension from filename; reject if not in `allowedExtensions`. Also reject files with no extension.

### Layer 2 — Declared MIME type check

`validate()` signature changes from `(String filename, long sizeBytes)` to `(MultipartFile file)`.

Extension → accepted MIME types map (hardcoded in validator):

| Extension | Accepted declared types |
|-----------|------------------------|
| pdf       | application/pdf |
| jpg/jpeg  | image/jpeg |
| png       | image/png |
| xlsx      | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/zip |
| xls       | application/vnd.ms-excel |
| csv       | text/csv, text/plain |
| doc       | application/msword |
| docx      | application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/zip |

Layer 2 validates `file.getContentType()` against this map. A null or unrecognised Content-Type fails.

Note: `application/zip` is accepted for xlsx/docx in Layer 2 because browsers legitimately send that Content-Type for OOXML files (they are ZIP archives). Layer 2 is intentionally permissive here; Layer 3 (Tika) then confirms the ZIP is specifically OOXML, not a plain archive.

### Layer 3 — Tika content inspection

Add to `pom.xml`:
```xml
<dependency>
  <groupId>org.apache.tika</groupId>
  <artifactId>tika-core</artifactId>
  <version>3.1.0</version>
</dependency>
<dependency>
  <groupId>org.apache.tika</groupId>
  <artifactId>tika-parser-microsoft-module</artifactId>
  <version>3.1.0</version>
</dependency>
```

Use `Tika.detect(InputStream, String filename)` — reads only the bytes needed for detection (magic bytes + OOXML inspection for ZIP-based formats), does not buffer the full file.

Detected type is validated against the same extension → MIME map as Layer 2. Mismatch → `FileValidationException("File content does not match its extension")`.

### Validation order

```
validate(MultipartFile file):
  1. validateFilename(filename)       — existing: blank, length, path traversal
  2. validateExtension(filename)      — Layer 1: allowlist check
  3. validateSize(sizeBytes)          — existing: size limit
  4. validateDeclaredMimeType(file)   — Layer 2: Content-Type header vs map
  5. validateActualMimeType(file)     — Layer 3: Tika detection vs map
```

### Callers

Both `MeDocumentService.uploadMyDocument()` and `DocumentService.upload()` call `fileUploadValidator.validate(...)`. Signature update propagates to both — no logic change required in services beyond passing `file` instead of `file.getOriginalFilename(), file.getSize()`.
