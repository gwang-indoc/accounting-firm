## Context

File uploads are validated by `FileUploadValidator` before being written to disk. The current validator uses an extension **blocklist** (`exe`, `js`) and trusts the browser-supplied `Content-Type` header. Both are trivially bypassed: a renamed file passes the blocklist, and an attacker can set any Content-Type header they like.

The `validate(String filename, long sizeBytes)` signature gives the validator no access to file bytes, making content inspection impossible without a signature change. Both upload services (`DocumentService` and `MeDocumentService`) call this method directly.

## Goals / Non-Goals

**Goals:**
- Replace the blocklist with an explicit allowlist of safe extensions
- Validate the declared MIME type against the expected type for the extension
- Inspect file bytes (via Tika) to confirm content matches the declared extension
- Keep all validation in one class (`FileUploadValidator`)

**Non-Goals:**
- Antivirus / malware scanning
- Rate-limiting
- i18n of validation error messages
- Supporting additional file types

## Decisions

### Decision 1: Allowlist over blocklist

**Choice:** `allowedExtensions` list replacing `blockedExtensions`.

**Rationale:** A blocklist requires anticipating every dangerous type. An allowlist permits only what the business actually needs. The frontend already restricts the file picker to the same set; the backend now enforces the same constraint authoritatively.

**Alternative considered:** Extend the blocklist with more extensions. Rejected — the attack surface grows with every new file format.

---

### Decision 2: Pass `MultipartFile` to validator (not just filename + size)

**Choice:** Change `validate(String filename, long sizeBytes)` to `validate(MultipartFile file)`.

**Rationale:** Layers 2 and 3 need the Content-Type header and the file's `InputStream`. These are only available on `MultipartFile`. Passing individual fields would require a growing parameter list for each new validation layer.

**Alternative considered:** Add `String contentType, InputStream stream` parameters. Rejected — brittle; callers must manage stream lifecycle, and a future Layer 4 would require another parameter change.

**Note on stream safety:** Spring's `MultipartFile` is backed by a temp file on disk. Calling `getInputStream()` multiple times is safe — each call opens a fresh read on the temp file. The validator reads only a prefix (enough for Tika detection) and closes the stream; the storage layer then reads the full file independently.

---

### Decision 3: `tika-core` + `tika-parser-microsoft-module` (not full `tika-parsers`)

**Choice:** Two targeted Tika dependencies.

**Rationale:** `tika-core` provides magic-byte detection for most formats. Without `tika-parser-microsoft-module`, Tika returns `application/zip` for XLSX and DOCX (they are ZIP archives) — indistinguishable from a plain `.zip` renamed to `.xlsx`. The Microsoft module adds `OOXMLDetector`, which reads `[Content_Types].xml` inside the archive and returns the correct OOXML MIME type.

**Alternative considered:** Accept `application/zip` as valid for XLSX/DOCX at Layer 3. Rejected — a renamed plain `.zip` would pass all three layers (Layer 1 allows `.xlsx`; Layer 2 accepts `application/zip` for xlsx; Layer 3 would see `application/zip` and accept). This creates a real attack vector.

**Alternative considered:** Full `tika-parsers` bundle. Rejected — pulls in parsers for PDF, media, and dozens of other formats; significant JAR size increase with no benefit for detection-only use.

---

### Decision 4: Layer 2 accepts `application/zip` for xlsx/docx

**Choice:** The declared MIME type map accepts `application/zip` as valid for `.xlsx` and `.docx` files (in addition to the OOXML MIME type).

**Rationale:** Some browsers send `Content-Type: application/zip` for OOXML files because they are ZIP archives. Rejecting this would break legitimate uploads from certain browsers. Layer 3 (Tika) closes the gap — it distinguishes OOXML ZIPs from plain ZIPs regardless of what the browser declares.

---

### Decision 5: Extension → MIME type map is hardcoded in validator

**Choice:** Hardcoded `Map<String, List<String>>` inside `FileUploadValidator`.

**Rationale:** The MIME type map is tightly coupled to security logic, not configuration. Making it configurable via `application.yml` would let a misconfigured deployment silently accept dangerous types. The allowed extensions (what users can upload) remain configurable via `ALLOWED_EXTENSIONS`; the security constraints on those extensions are not.

## Risks / Trade-offs

- **[CSV detection]** Tika has no magic bytes for CSV; it returns `text/plain`. The allowlist map must accept `text/plain` as valid for `.csv` at both Layer 2 and Layer 3. A plain text file renamed to `.csv` will pass all three layers — acceptable given that a plain text file is not a security risk. → Accepted trade-off; documented in constraints.

- **[OOXML detection performance]** `OOXMLDetector` opens the ZIP and reads `[Content_Types].xml`. This is fast (< 5 ms on local disk) but adds I/O to every upload. → Acceptable; upload path already involves disk I/O for storage.

- **[Stream consumption]** If `getInputStream()` does not support multiple reads (e.g., a non-file-backed multipart implementation in tests), Layer 3 may consume the stream before storage. → Mitigated by the test fixture design: use real `MockMultipartFile` backed by byte arrays, which supports multiple `getInputStream()` calls.

- **[Tika version drift]** Tika's detection heuristics improve over releases. A future Tika upgrade may detect a type differently, causing previously-accepted files to be rejected. → Managed by pinning the Tika version in `pom.xml` and testing against real file fixtures on any dependency upgrade.

## Migration Plan

1. Deploy with new `ALLOWED_EXTENSIONS` env var set to `pdf,jpg,jpeg,png,xlsx,xls,csv,doc,docx`. If the env var is absent, the default in `application.yml` applies.
2. Remove `BLOCKED_EXTENSIONS` env var from all deployment environments after deploy.
3. No DB migration required.
4. No rollback complexity — if the new validator is too strict, revert the JAR and redeploy. No data was mutated.

## Open Questions

_(none — all design decisions resolved during exploration and brainstorming)_
