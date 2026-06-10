## 1. Infrastructure — Tika dependencies, StorageProperties rename, application.yml

### Contract
- **Spec**: The system SHALL read upload constraints from `application.yml` under `app.storage.*` and SHALL support overriding them via environment variables without redeployment. When the `ALLOWED_EXTENSIONS` environment variable is set to a comma-separated list of extensions, the system SHALL accept uploads only for files with those extensions and reject all others.
- **Runtime**: `cd backend && ./mvnw test -Dtest=StoragePropertiesTest,FileUploadValidatorTest` → expected: all tests in those classes pass; if classes don't exist yet, full suite passes with no new failures
- **Code**: `allowedExtensions` replaces `blockedExtensions` in `StorageProperties` (record field rename). Env var renamed from `BLOCKED_EXTENSIONS` to `ALLOWED_EXTENSIONS`. Default value in `application.yml`: `pdf,jpg,jpeg,png,xlsx,xls,csv,doc,docx`. The MIME-type-to-extension map is hardcoded in `FileUploadValidator`, NOT in config — misconfigured deployments must not silently accept dangerous types.
- **Threshold**: 80

- [x] 1.0 CONTRACT — write openspec/changes/file-upload-type-verification/contracts/group-1.md with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [x] 1.1 Add `tika-core` and `tika-parser-microsoft-module` (version 3.1.0) to `backend/pom.xml`
- [x] 1.2 Rename `StorageProperties.blockedExtensions` → `allowedExtensions`; update `application.yml` `blocked-extensions` → `allowed-extensions` with default `pdf,jpg,jpeg,png,xlsx,xls,csv,doc,docx`; update env var reference from `BLOCKED_EXTENSIONS` to `ALLOWED_EXTENSIONS`
- [x] 1.3 RED — write `StoragePropertiesTest` verifying that `allowedExtensions` binds correctly from `application.yml` and that `blockedExtensions` no longer exists on the record
- [x] 1.4 GREEN — confirm test passes (property binding is done in 1.2; fix any binding issues)
- [x] 1.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-1.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 2. Layer 1 — Extension allowlist + validator signature change + callers

### Contract
- **Spec**: When an authenticated user uploads a file whose extension is not in the `allowed-extensions` list, the system SHALL return `400 Bad Request` with a message listing the allowed types, without writing any file. When an authenticated user uploads a file with no extension, the system SHALL return `400 Bad Request` without writing any file.
- **Runtime**: `cd backend && ./mvnw test -Dtest=FileUploadValidatorTest,DocumentServiceTest,MeDocumentServiceTest` → expected: all tests pass; allowlist rejection scenarios covered
- **Code**: `validate(String filename, long sizeBytes)` → `validate(MultipartFile file)`; extract filename, size, contentType from `MultipartFile` inside the validator. Both `DocumentService` and `MeDocumentService` pass `file` directly instead of `file.getOriginalFilename(), file.getSize()`. Allowlist check: reject if no extension OR extension not in `allowedExtensions` (case-insensitive).
- **Threshold**: 80

- [x] 2.0 CONTRACT — write openspec/changes/file-upload-type-verification/contracts/group-2.md with the ### Contract block above
- [x] 2.1 RED — write `FileUploadValidatorTest` cases: disallowed extension (`.zip`) rejected with 400; no extension rejected; allowed extension (`.pdf`) accepted; existing size/filename tests still pass
- [x] 2.2 GREEN — update `FileUploadValidator.validate()` signature to `(MultipartFile file)`; rewrite `validateExtension()` to use allowlist; extract filename/size from `MultipartFile`
- [x] 2.3 Update callers: `MeDocumentService.uploadMyDocument()` and `DocumentService.upload()` — pass `file` directly to `fileUploadValidator.validate(file)`
- [x] 2.4 RED — add integration-level tests in `DocumentServiceTest` confirming disallowed extension throws `FileValidationException`
- [x] 2.5 GREEN — confirm all tests pass after caller updates
- [x] 2.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-2.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 3. Layers 2 & 3 — Declared MIME type check + Tika content inspection

### Contract
- **Spec**: When an authenticated user uploads a file whose `Content-Type` header does not match the expected MIME types for its extension, the system SHALL return `400 Bad Request` without writing any file. When an authenticated user uploads a file whose actual byte content (as detected by Tika) does not match the expected MIME types for its extension (e.g. a renamed `.exe` presented as `.pdf`), the system SHALL return `400 Bad Request` with message `"File content does not match its extension"`, without writing any file.
- **Runtime**: `cd backend && ./mvnw test -Dtest=FileUploadValidatorTest` → expected: all Layer 2 and Layer 3 test cases pass, including renamed-exe-as-pdf and plain-zip-as-xlsx rejection
- **Code**: Extension → MIME types map is hardcoded in `FileUploadValidator` (not configurable). `application/zip` is accepted for xlsx/docx at Layer 2 (browsers send this) — Layer 3 (OOXMLDetector) then confirms it is genuinely OOXML. CSV has no magic bytes; Tika returns `text/plain` — map must accept `text/plain` for `.csv`. Use `Tika.detect(InputStream, filename)` for detection; `MultipartFile.getInputStream()` is safe to call multiple times (Spring temp-file backing).
- **Threshold**: 80

- [x] 3.0 CONTRACT — write openspec/changes/file-upload-type-verification/contracts/group-3.md with the ### Contract block above
- [x] 3.1 RED — write `FileUploadValidatorTest` cases for Layer 2: `Content-Type: application/octet-stream` with `.pdf` extension rejected; `Content-Type: application/zip` with `.xlsx` extension accepted (Layer 2 permissive)
- [x] 3.2 GREEN — add `validateDeclaredMimeType(MultipartFile file)` using hardcoded extension → MIME types map; wire into `validate()` after `validateExtension()`
- [x] 3.3 RED — write `FileUploadValidatorTest` cases for Layer 3: actual `.exe` bytes named `evil.pdf` rejected; actual `.zip` bytes named `evil.xlsx` rejected; actual `.pdf` bytes accepted; `.csv` text file accepted; `.xlsx` OOXML file accepted
- [x] 3.4 GREEN — add `validateActualMimeType(MultipartFile file)` using `Tika.detect()`; wire into `validate()` after `validateDeclaredMimeType()`
- [x] 3.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-3.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 4. Verification & ship

- [x] 4.1 Run full backend test suite: `cd backend && ./mvnw test` — ensure no regressions (3 ContactIntegrationTest/ContactSecurityTest failures are pre-existing JavaMailSender issue, unrelated to this change)
- [x] 4.2 Run full frontend test suite: `cd frontend && npx ng test --no-watch` — ensure no regressions (pre-existing failures: TranslateService missing in document/app specs, unrelated to this change)
- [x] 4.3 Run e2e suite if servers are up: `cd e2e && npx playwright test` — ensure upload happy path still passes (9 upload E2E pass; 4 pre-existing failures in messaging/mobile/language unrelated to this change)
- [x] 4.4 Run superpowers:verification-before-completion
