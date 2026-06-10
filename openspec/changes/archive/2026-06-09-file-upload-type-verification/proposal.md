---
Date: 2026-06-08
Change: file-upload-type-verification
Requirements: requirements.md
---

## Why

The current upload validator uses an extension blocklist (`exe`, `js`) and trusts the browser-supplied Content-Type. A renamed malicious file (e.g. `evil.exe` → `evil.pdf`) bypasses all validation and is stored on disk. This change adds three defense layers — extension allowlist, declared MIME verification, and Tika content inspection — to reject files whose actual byte content does not match their declared type.

## What Changes

- **BREAKING** `StorageProperties.blockedExtensions` removed; replaced with `allowedExtensions` (default: `pdf,jpg,jpeg,png,xlsx,xls,csv,doc,docx`). Env var renamed from `BLOCKED_EXTENSIONS` to `ALLOWED_EXTENSIONS`.
- `FileUploadValidator.validate()` signature changes from `(String filename, long sizeBytes)` to `(MultipartFile file)`.
- `FileUploadValidator` gains two new validation steps: declared MIME type check (Layer 2) and Tika content inspection (Layer 3).
- `tika-core` and `tika-parser-microsoft-module` added to `backend/pom.xml`.
- Both `MeDocumentService` and `DocumentService` updated to pass `MultipartFile` directly to the validator.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- **client-document-uploads** — validation requirements change: blocklist → allowlist; new MIME and content-inspection rejection scenarios added.

## Impact

- `backend/pom.xml` — two new Tika dependencies
- `backend/src/main/resources/application.yml` — `blocked-extensions` → `allowed-extensions`; env var rename
- `backend/src/main/java/com/gwhaitech/accountingfirm/storage/StorageProperties.java` — field rename
- `backend/src/main/java/com/gwhaitech/accountingfirm/storage/FileUploadValidator.java` — full rewrite of validation logic
- `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/MeDocumentService.java` — caller signature update
- `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/DocumentService.java` — caller signature update
- `backend/src/test/java/...FileUploadValidatorTest.java` — new/updated unit tests

## Out of Scope

- Antivirus / malware scanning (separate future change)
- Rate-limiting uploads (separate future change)
- i18n of server-side validation error messages (pre-existing pattern; deferred)
- Frontend file picker `accept` attribute changes (already correct; cosmetic)
- Supporting file types beyond `pdf,jpg,jpeg,png,xlsx,xls,csv,doc,docx`
