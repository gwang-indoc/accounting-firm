### Contract

- **Spec**: When an authenticated user uploads a file whose extension is not in the `allowed-extensions` list, the system SHALL return `400 Bad Request` with a message listing the allowed types, without writing any file. When an authenticated user uploads a file with no extension, the system SHALL return `400 Bad Request` without writing any file.
- **Runtime**: `cd backend && ./mvnw test -Dtest=FileUploadValidatorTest,DocumentServiceTest,MeDocumentServiceTest` → expected: all tests pass; allowlist rejection scenarios covered; disallowed extension and no-extension cases tested
- **Code**: `validate(String filename, long sizeBytes)` → `validate(MultipartFile file)`; extract filename, size, contentType from `MultipartFile` inside the validator. Both `DocumentService` and `MeDocumentService` pass `file` directly instead of `file.getOriginalFilename(), file.getSize()`. Allowlist check: reject if no extension OR extension not in `allowedExtensions` (case-insensitive).
- **Threshold**: 80
