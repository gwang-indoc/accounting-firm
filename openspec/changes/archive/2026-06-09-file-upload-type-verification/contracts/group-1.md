### Contract

- **Spec**: The system SHALL read upload constraints from `application.yml` under `app.storage.*` and SHALL support overriding them via environment variables without redeployment. When the `ALLOWED_EXTENSIONS` environment variable is set to a comma-separated list of extensions, the system SHALL accept uploads only for files with those extensions and rejects all others.
- **Runtime**: `cd backend && ./mvnw test -Dtest=StoragePropertiesTest,FileUploadValidatorTest` → expected: all tests in those classes pass; StoragePropertiesTest verifies `allowedExtensions` accessor exists and binds correctly
- **Code**: `allowedExtensions` replaces `blockedExtensions` in `StorageProperties` (record field rename). Env var renamed from `BLOCKED_EXTENSIONS` to `ALLOWED_EXTENSIONS`. Default value in `application.yml`: `pdf,jpg,jpeg,png,xlsx,xls,csv,doc,docx`. The MIME-type-to-extension map is hardcoded in `FileUploadValidator`, NOT in config — misconfigured deployments must not silently accept dangerous types.
- **Threshold**: 80
