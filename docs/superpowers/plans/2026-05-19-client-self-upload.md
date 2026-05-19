# Client Self-Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in client upload their own documents to `/portal/documents`. Uploaded files appear in the same year-filtered list as firm-shared documents, with an "Uploaded by you" chip. Duplicate filenames within a `(clientId, year)` are rejected.

**Architecture:** New endpoint `POST /api/me/documents?year=YYYY` (multipart) on the existing `MeDocumentController`. Validation logic extracted from `DocumentService` into a shared `FileUploadValidator` `@Component`. List DTO `MyDocumentsDto.Item` gains a boolean `uploadedByMe` field. Frontend adds an Upload button to the controls row of `DocumentsComponent` and a chip on uploaded-by-me rows. No DB migration — `client_documents.uploaded_by` already exists.

**Tech Stack:** Java 21, Spring Boot 3.5, Spring Data JPA, PostgreSQL, JUnit 5 + Mockito + `@WebMvcTest` / `@DataJpaTest`. Angular 21 standalone components (zoneless), RxJS, Vitest + TestBed, Playwright.

**Reference docs:**
- Authoritative spec: `docs/superpowers/specs/2026-05-19-client-self-upload-design.md`
- Project conventions: `CLAUDE.md`
- TDD/checkbox/review/dev-log rules: `openspec/schemas/openspec-superpowers/schema.yaml` (`apply.instruction`)
- UI tokens (chips, spacing, colour): `docs/ui-design-guide.md`

**Discipline reminders (from `apply.instruction`):**
- RED first: write the failing test → run it → paste the failure line to the dev log → THEN implement.
- GREEN: minimal impl to pass → run the test → commit test + impl together.
- Run the full suite at the start of each new task group to confirm a green baseline.
- After each major group (Tasks 6, 9, 12) run `superpowers:requesting-code-review` and update `docs/log/2026-05-19.md`.
- Final group (Tasks 10–12) covers UI, so it MUST include a Playwright E2E and `superpowers:verification-before-completion`.

---

## Pre-flight: baseline

Confirm the suites are green before starting. Any later failure is attributable to this work.

- [ ] **Step 1: Backend baseline**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test
```

Expected: pass except 4 pre-existing `@SpringBootTest` failures (`LoggingMailSenderTest`, `ContactIntegrationTest`, `ContactSecurityTest`) tied to environment-specific setup. **Write down the failure count.** Any task whose run grows the count introduces a regression.

- [ ] **Step 2: Frontend baseline**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npx ng test --no-watch
```

Expected: all pass.

- [ ] **Step 3: E2E baseline (optional now; required before Task 10)**

If the local Postgres and dev servers happen to be running:

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/e2e && npx playwright test
```

Otherwise skip — Task 10 will require both servers up.

- [ ] **Step 4: Create today's dev log**

```bash
test -f /Users/gwang/Develop/superpowers_test/accounting-firm/docs/log/2026-05-19.md || \
  printf "# 2026-05-19\n\n" > /Users/gwang/Develop/superpowers_test/accounting-firm/docs/log/2026-05-19.md
```

Subsequent code-review / dev-log tasks append entries to this file.

---

## Task 1: Extract `FileUploadValidator`

Pure refactor. Lifts the three private validators out of `DocumentService` so the new client-self upload path can reuse them without inheriting `DocumentService`'s overwrite-on-duplicate policy.

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/storage/FileUploadValidator.java`
- Create test: `backend/src/test/java/com/gwhaitech/accountingfirm/storage/FileUploadValidatorTest.java`
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/DocumentService.java` (replace the three private validate methods with a single call)

- [ ] **Step 1: Write the failing validator unit test**

Create `backend/src/test/java/com/gwhaitech/accountingfirm/storage/FileUploadValidatorTest.java`:

```java
package com.gwhaitech.accountingfirm.storage;

import com.gwhaitech.accountingfirm.client.exception.FileValidationException;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileUploadValidatorTest {

    private final StorageProperties props = new StorageProperties(
            Path.of("/tmp/uploads"), 10, 100, List.of("exe", "js"));
    private final FileUploadValidator validator = new FileUploadValidator(props);

    @Test
    void validate_acceptsHappyPath() {
        validator.validate("T4-2024.pdf", 500_000L);
        // no exception
    }

    @Test
    void validate_rejectsEmptyFilename() {
        assertThatThrownBy(() -> validator.validate("", 1L))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("must not be empty");
    }

    @Test
    void validate_rejectsNullFilename() {
        assertThatThrownBy(() -> validator.validate(null, 1L))
                .isInstanceOf(FileValidationException.class);
    }

    @Test
    void validate_rejectsOversizeFilename() {
        String tooLong = "a".repeat(101) + ".pdf";
        assertThatThrownBy(() -> validator.validate(tooLong, 1L))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("exceeds max length");
    }

    @Test
    void validate_rejectsPathTraversal() {
        assertThatThrownBy(() -> validator.validate("../secrets.pdf", 1L))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("illegal path characters");
        assertThatThrownBy(() -> validator.validate("a/b.pdf", 1L))
                .isInstanceOf(FileValidationException.class);
        assertThatThrownBy(() -> validator.validate("a\\b.pdf", 1L))
                .isInstanceOf(FileValidationException.class);
    }

    @Test
    void validate_rejectsBlockedExtension() {
        assertThatThrownBy(() -> validator.validate("evil.exe", 1L))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("Blocked file extension: .exe");
        assertThatThrownBy(() -> validator.validate("Evil.EXE", 1L))
                .isInstanceOf(FileValidationException.class);
    }

    @Test
    void validate_allowsExtensionlessFile() {
        validator.validate("README", 1L);
    }

    @Test
    void validate_rejectsOversizeBytes() {
        long oversize = 11L * 1024 * 1024;
        assertThatThrownBy(() -> validator.validate("ok.pdf", oversize))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("exceeds max size of 10 MB");
    }

    @Test
    void validate_treatsTrailingDotAsExtensionless() {
        // "foo." — extension is empty → allowed (no blocked-extension check applies)
        validator.validate("foo.", 1L);
    }
}
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && \
  ./mvnw test -Dtest=FileUploadValidatorTest
```

Expected: compilation failure (`cannot find symbol class FileUploadValidator`). Paste the failure line into `docs/log/2026-05-19.md` under a temporary heading; you'll consolidate during the Task 6 dev-log update.

- [ ] **Step 3: Create the validator**

Create `backend/src/main/java/com/gwhaitech/accountingfirm/storage/FileUploadValidator.java`:

```java
package com.gwhaitech.accountingfirm.storage;

import com.gwhaitech.accountingfirm.client.exception.FileValidationException;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class FileUploadValidator {

    private final StorageProperties storageProperties;

    public FileUploadValidator(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    public void validate(String filename, long sizeBytes) {
        validateFilename(filename);
        validateExtension(filename);
        validateSize(sizeBytes);
    }

    private void validateFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            throw new FileValidationException("Filename must not be empty");
        }
        if (filename.length() > storageProperties.maxFilenameLength()) {
            throw new FileValidationException(
                    "Filename exceeds max length of " + storageProperties.maxFilenameLength());
        }
        if (filename.contains("/") || filename.contains("\\") || filename.contains("..")) {
            throw new FileValidationException("Filename contains illegal path characters");
        }
    }

    private void validateExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return;
        }
        String ext = filename.substring(dot + 1).toLowerCase(Locale.ROOT);
        if (storageProperties.blockedExtensions().contains(ext)) {
            throw new FileValidationException("Blocked file extension: ." + ext);
        }
    }

    private void validateSize(long sizeBytes) {
        long maxBytes = storageProperties.maxFileSizeMb() * 1024L * 1024L;
        if (sizeBytes > maxBytes) {
            throw new FileValidationException(
                    "File exceeds max size of " + storageProperties.maxFileSizeMb() + " MB");
        }
    }
}
```

(Body is lifted verbatim from `DocumentService`'s private validators — no behavior change.)

- [ ] **Step 4: Run the validator test and confirm it passes**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && \
  ./mvnw test -Dtest=FileUploadValidatorTest
```

Expected: 9 tests pass.

- [ ] **Step 5: Refactor `DocumentService` to use the validator**

Edit `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/DocumentService.java`:

1. Add the import:
```java
import com.gwhaitech.accountingfirm.storage.FileUploadValidator;
```

2. Add the field and update the constructor to inject it:
```java
private final FileUploadValidator fileUploadValidator;

public DocumentService(LocalStorageService localStorageService,
                       ClientDocumentRepository clientDocumentRepository,
                       ClientRepository clientRepository,
                       StorageProperties storageProperties,
                       FileUploadValidator fileUploadValidator) {
    this.localStorageService = localStorageService;
    this.clientDocumentRepository = clientDocumentRepository;
    this.clientRepository = clientRepository;
    this.storageProperties = storageProperties;
    this.fileUploadValidator = fileUploadValidator;
}
```

3. Replace the three calls in `upload(...)`:
```java
// before:
validateFilename(filename);
validateExtension(filename);
validateSize(sizeBytes);

// after:
fileUploadValidator.validate(filename, sizeBytes);
```

4. **Delete** the three private methods `validateFilename`, `validateExtension`, `validateSize`, and **remove** the now-unused `import java.util.Locale;`.

5. The `private final StorageProperties storageProperties;` field is no longer read inside `DocumentService` itself — but it stays untouched if any other code path needs it. Check: `grep -n storageProperties DocumentService.java` should return only the constructor parameter, field declaration, and assignment. If yes, remove the field, the parameter, and the constructor assignment to keep the class lean.

- [ ] **Step 6: Run the full backend suite and confirm no regression**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test
```

Expected: same baseline failure count as Pre-flight Step 1, all `DocumentService*` tests still pass. The existing `DocumentServiceTest` exercises validation paths and proves the extraction is behaviour-preserving.

- [ ] **Step 7: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add backend/src/main/java/com/gwhaitech/accountingfirm/storage/FileUploadValidator.java \
        backend/src/test/java/com/gwhaitech/accountingfirm/storage/FileUploadValidatorTest.java \
        backend/src/main/java/com/gwhaitech/accountingfirm/client/service/DocumentService.java
git commit -m "$(cat <<'EOF'
refactor(storage): extract FileUploadValidator from DocumentService

Pulls filename/extension/size validation into a shared @Component so
the upcoming client-self upload path can reuse it without inheriting
DocumentService's overwrite-on-duplicate policy. No behavior change
for the existing staff-side upload.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add `uploadedByMe` to `MyDocumentsDto.Item`

Lights up the badge data for the list endpoint, with no upload path yet. Keeps each change small.

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/client/dto/MyDocumentsDto.java`
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/MeDocumentService.java`
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/client/service/MeDocumentServiceTest.java` (if absent, find the canonical list of existing `MeDocumentService` tests and extend them; if no test class exists, create one — pattern below)
- Modify: `frontend/src/app/core/models/my-documents.ts`
- Modify: `frontend/src/app/features/client-portal/documents/documents.component.spec.ts` (extend fixtures with the new field)

- [ ] **Step 1: Locate or scaffold the backend test for `MeDocumentService.listMyDocuments`**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && \
  find src/test -name "MeDocumentServiceTest.java"
```

If it exists, open it. If not, create `backend/src/test/java/com/gwhaitech/accountingfirm/client/service/MeDocumentServiceTest.java` with a `@DataJpaTest` shell using the same Postgres `@TestPropertySource` pattern as `ClientRepositoryTest` (see the prior plan `docs/superpowers/plans/2026-05-15-client-documents-view.md` Task 1 for the exact properties to copy).

- [ ] **Step 2: Write the failing list-flag test**

Add this test (it lives next to existing list tests). Adjust the helper factory names to match whatever the file already uses for creating `Client` / `ClientDocument` rows.

```java
@Test
void listMyDocuments_setsUploadedByMeBasedOnUploadedByVsRequestingUserId() {
    User me = new User();
    me.setId(7L);
    me.setEmail("jane@example.com");

    Client client = new Client();
    client.setName("Jane Smith");
    client.setEmail("jane@example.com");
    client.setUserId(me.getId());
    clientRepository.save(client);

    ClientDocument fromFirm = new ClientDocument();
    fromFirm.setClientId(client.getId());
    fromFirm.setYear((short) 2024);
    fromFirm.setFilename("Tax-Return-2024.pdf");
    fromFirm.setFilePath("clients/" + client.getId() + "/2024/Tax-Return-2024.pdf");
    fromFirm.setUploadedBy(99L); // staff user id, NOT me
    documentRepository.save(fromFirm);

    ClientDocument fromMe = new ClientDocument();
    fromMe.setClientId(client.getId());
    fromMe.setYear((short) 2024);
    fromMe.setFilename("T4-2024.pdf");
    fromMe.setFilePath("clients/" + client.getId() + "/2024/T4-2024.pdf");
    fromMe.setUploadedBy(me.getId());
    documentRepository.save(fromMe);

    MyDocumentsDto result = service.listMyDocuments(me);

    assertThat(result.linked()).isTrue();
    assertThat(result.documents()).hasSize(2);
    Map<String, Boolean> byName = result.documents().stream()
            .collect(java.util.stream.Collectors.toMap(
                    MyDocumentsDto.Item::filename,
                    MyDocumentsDto.Item::uploadedByMe));
    assertThat(byName).containsEntry("Tax-Return-2024.pdf", false);
    assertThat(byName).containsEntry("T4-2024.pdf", true);
}
```

If the test class doesn't have wiring for `ClientRepository`/`ClientDocumentRepository`, autowire them at the top.

- [ ] **Step 3: Run the test and confirm it fails**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && \
  ./mvnw test -Dtest=MeDocumentServiceTest#listMyDocuments_setsUploadedByMeBasedOnUploadedByVsRequestingUserId
```

Expected: compilation failure (`method uploadedByMe() not found in MyDocumentsDto.Item`). Paste the failure line into `docs/log/2026-05-19.md`.

- [ ] **Step 4: Add the field to the DTO**

Replace the `Item` record inside `backend/src/main/java/com/gwhaitech/accountingfirm/client/dto/MyDocumentsDto.java`:

```java
package com.gwhaitech.accountingfirm.client.dto;

import java.time.LocalDateTime;
import java.util.List;

public record MyDocumentsDto(
        boolean linked,
        String clientName,
        List<Item> documents
) {
    public record Item(
            Long id,
            int year,
            String filename,
            String mimeType,
            Long sizeBytes,
            LocalDateTime uploadedAt,
            boolean uploadedByMe
    ) {}
}
```

- [ ] **Step 5: Populate the new field in `MeDocumentService.listMyDocuments`**

Edit `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/MeDocumentService.java` — update the mapping inside `listMyDocuments`:

```java
List<MyDocumentsDto.Item> items = documentRepository
        .findByClientIdOrderByYearDescUploadedAtDesc(c.getId())
        .stream()
        .map(d -> new MyDocumentsDto.Item(
                d.getId(),
                (int) d.getYear(),
                d.getFilename(),
                d.getMimeType(),
                d.getSizeBytes(),
                d.getUploadedAt(),
                user.getId().equals(d.getUploadedBy())))
        .toList();
```

- [ ] **Step 6: Run the backend test and confirm it passes**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && \
  ./mvnw test -Dtest=MeDocumentServiceTest
```

Expected: green.

- [ ] **Step 7: Update the frontend type**

Edit `frontend/src/app/core/models/my-documents.ts`:

```ts
export interface MyDocumentItem {
  id: number;
  year: number;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: string;
  uploadedByMe: boolean;
}

export interface MyDocumentsResponse {
  linked: boolean;
  clientName: string | null;
  documents: MyDocumentItem[];
}
```

- [ ] **Step 8: Extend the frontend fixtures**

Edit `frontend/src/app/features/client-portal/documents/documents.component.spec.ts` — update `linkedResponse()` to set the flag on every fixture row:

```ts
function linkedResponse(): MyDocumentsResponse {
  return {
    linked: true,
    clientName: 'Jane Smith',
    documents: [
      { id: 1, year: 2025, filename: 'T4-2025.pdf',          mimeType: 'application/pdf', sizeBytes: 50_000,  uploadedAt: '2026-02-14T10:23:00', uploadedByMe: false },
      { id: 2, year: 2025, filename: 'Tax-Return-2025.pdf',  mimeType: 'application/pdf', sizeBytes: 200_000, uploadedAt: '2026-03-02T09:00:00', uploadedByMe: false },
      { id: 3, year: 2024, filename: 'T4-2024.pdf',          mimeType: 'application/pdf', sizeBytes: 48_000,  uploadedAt: '2025-02-12T10:00:00', uploadedByMe: false },
    ],
  };
}
```

Also grep the whole frontend tree for any other `MyDocumentItem` literal that needs the new field, then patch them:

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && \
  grep -rn "uploadedAt:" src/ | grep -v "uploadedByMe"
```

Add `uploadedByMe: false` (or `true` as appropriate) to each hit.

- [ ] **Step 9: Run the frontend tests and confirm green**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && \
  npx ng test --no-watch
```

Expected: all pass.

- [ ] **Step 10: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add backend/src/main/java/com/gwhaitech/accountingfirm/client/dto/MyDocumentsDto.java \
        backend/src/main/java/com/gwhaitech/accountingfirm/client/service/MeDocumentService.java \
        backend/src/test/java/com/gwhaitech/accountingfirm/client/service/MeDocumentServiceTest.java \
        frontend/src/app/core/models/my-documents.ts \
        frontend/src/app/features/client-portal/documents/documents.component.spec.ts
git commit -m "$(cat <<'EOF'
feat(api): add uploadedByMe flag to MyDocumentsDto.Item

Service stamps the flag per row by comparing client_document.uploaded_by
against the authenticated user's id. Prepares the data the upcoming
"Uploaded by you" chip needs on /portal/documents.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: New exceptions + global handler mappings

Two exceptions and their HTTP mappings, decoupled from the service work so the upload service can throw them with confidence.

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/client/exception/DocumentNameConflictException.java`
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/client/exception/PortalNotLinkedException.java`
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/common/exception/GlobalExceptionHandler.java`
- Create test: `backend/src/test/java/com/gwhaitech/accountingfirm/common/exception/GlobalExceptionHandlerTest.java` (extend if it exists)

- [ ] **Step 1: Write the failing handler tests**

Create or extend `backend/src/test/java/com/gwhaitech/accountingfirm/common/exception/GlobalExceptionHandlerTest.java`:

```java
package com.gwhaitech.accountingfirm.common.exception;

import com.gwhaitech.accountingfirm.client.exception.DocumentNameConflictException;
import com.gwhaitech.accountingfirm.client.exception.PortalNotLinkedException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void mapsDocumentNameConflictTo409WithFilenameAndYear() {
        ResponseEntity<?> response = handler.handleNameConflict(
                new DocumentNameConflictException("T4.pdf", 2024));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().toString())
                .contains("T4.pdf")
                .contains("2024");
    }

    @Test
    void mapsPortalNotLinkedTo403() {
        ResponseEntity<?> response = handler.handlePortalNotLinked(
                new PortalNotLinkedException());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().toString())
                .contains("portal isn't set up");
    }
}
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && \
  ./mvnw test -Dtest=GlobalExceptionHandlerTest
```

Expected: compilation failure (`DocumentNameConflictException`, `PortalNotLinkedException`, `handleNameConflict`, `handlePortalNotLinked` not found). Paste the failure into `docs/log/2026-05-19.md`.

- [ ] **Step 3: Create the conflict exception**

Create `backend/src/main/java/com/gwhaitech/accountingfirm/client/exception/DocumentNameConflictException.java`:

```java
package com.gwhaitech.accountingfirm.client.exception;

public class DocumentNameConflictException extends RuntimeException {
    private final String filename;
    private final int year;

    public DocumentNameConflictException(String filename, int year) {
        super("A file named \"" + filename + "\" already exists for " + year + ".");
        this.filename = filename;
        this.year = year;
    }

    public String getFilename() { return filename; }
    public int getYear() { return year; }
}
```

- [ ] **Step 4: Create the not-linked exception**

Create `backend/src/main/java/com/gwhaitech/accountingfirm/client/exception/PortalNotLinkedException.java`:

```java
package com.gwhaitech.accountingfirm.client.exception;

public class PortalNotLinkedException extends RuntimeException {
    public PortalNotLinkedException() {
        super("Your portal isn't set up yet.");
    }
}
```

- [ ] **Step 5: Add the handler mappings**

Edit `backend/src/main/java/com/gwhaitech/accountingfirm/common/exception/GlobalExceptionHandler.java` — add the two new methods, leaving the existing handlers untouched. Final file:

```java
package com.gwhaitech.accountingfirm.common.exception;

import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.DocumentNameConflictException;
import com.gwhaitech.accountingfirm.client.exception.DocumentNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.FileValidationException;
import com.gwhaitech.accountingfirm.client.exception.PortalNotLinkedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ClientNotFoundException.class)
    public ResponseEntity<Void> handleClientNotFound(ClientNotFoundException ex) {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(DocumentNotFoundException.class)
    public ResponseEntity<Void> handleDocumentNotFound(DocumentNotFoundException ex) {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(FileValidationException.class)
    public ResponseEntity<String> handleFileValidation(FileValidationException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<String> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return ResponseEntity.badRequest().body("File exceeds the maximum allowed upload size");
    }

    @ExceptionHandler(DocumentNameConflictException.class)
    public ResponseEntity<Map<String, Object>> handleNameConflict(DocumentNameConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "message", ex.getMessage(),
                "filename", ex.getFilename(),
                "year", ex.getYear()
        ));
    }

    @ExceptionHandler(PortalNotLinkedException.class)
    public ResponseEntity<Map<String, String>> handlePortalNotLinked(PortalNotLinkedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "message", ex.getMessage()
        ));
    }
}
```

- [ ] **Step 6: Run the handler test and confirm it passes**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && \
  ./mvnw test -Dtest=GlobalExceptionHandlerTest
```

Expected: 2 tests pass (plus whatever was already in the file).

- [ ] **Step 7: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add backend/src/main/java/com/gwhaitech/accountingfirm/client/exception/DocumentNameConflictException.java \
        backend/src/main/java/com/gwhaitech/accountingfirm/client/exception/PortalNotLinkedException.java \
        backend/src/main/java/com/gwhaitech/accountingfirm/common/exception/GlobalExceptionHandler.java \
        backend/src/test/java/com/gwhaitech/accountingfirm/common/exception/GlobalExceptionHandlerTest.java
git commit -m "$(cat <<'EOF'
feat(exceptions): add DocumentNameConflict (409) and PortalNotLinked (403)

Wired into GlobalExceptionHandler. 409 body carries { message, filename,
year } so the frontend can format a precise duplicate-name snackbar.
403 body carries { message }. Used by the upcoming POST /api/me/documents.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `MeDocumentService.uploadMyDocument`

The actual upload policy: resolve linked client → validate → reject duplicates → save row → write file. DB-first ordering mirrors `DocumentService.upload` so `@Transactional` rolls back if the file write throws.

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/MeDocumentService.java`
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/client/service/MeDocumentServiceTest.java`

- [ ] **Step 1: Write the failing upload tests**

Append to `MeDocumentServiceTest.java`. The fixture helpers (`saveClient`, `saveDoc`) are whatever the file already uses — adjust the calls below to match.

```java
@Test
void uploadMyDocument_storesRowAndFile_uploadedByMeTrue(@TempDir Path tempDir) throws Exception {
    // tempDir overrides app.storage.upload-dir via @TestPropertySource on this test;
    // see header annotations to make sure LocalStorageService.baseDir resolves to tempDir.

    User me = newUser(7L, "jane@example.com");
    Client client = saveClient("jane@example.com", me.getId());

    MockMultipartFile file = new MockMultipartFile(
            "file", "T4-2024.pdf", "application/pdf", "hello".getBytes());

    MyDocumentsDto.Item item = service.uploadMyDocument(me, 2024, file);

    assertThat(item.filename()).isEqualTo("T4-2024.pdf");
    assertThat(item.uploadedByMe()).isTrue();
    assertThat(item.year()).isEqualTo(2024);
    assertThat(documentRepository.findByClientIdAndYearAndFilename(
            client.getId(), 2024, "T4-2024.pdf")).isPresent();

    Path expected = tempDir.resolve("clients/" + client.getId() + "/2024/T4-2024.pdf");
    assertThat(java.nio.file.Files.exists(expected)).isTrue();
    assertThat(java.nio.file.Files.readString(expected)).isEqualTo("hello");
}

@Test
void uploadMyDocument_rejectsDuplicate_filenameYearPair(@TempDir Path tempDir) {
    User me = newUser(7L, "jane@example.com");
    Client client = saveClient("jane@example.com", me.getId());

    // pre-existing row + on-disk file
    ClientDocument existing = new ClientDocument();
    existing.setClientId(client.getId());
    existing.setYear((short) 2024);
    existing.setFilename("T4-2024.pdf");
    existing.setFilePath("clients/" + client.getId() + "/2024/T4-2024.pdf");
    existing.setUploadedBy(999L);
    documentRepository.save(existing);

    MockMultipartFile file = new MockMultipartFile(
            "file", "T4-2024.pdf", "application/pdf", "second".getBytes());

    assertThatThrownBy(() -> service.uploadMyDocument(me, 2024, file))
            .isInstanceOf(DocumentNameConflictException.class);

    // no second row inserted
    assertThat(documentRepository.findByClientIdAndYearOrderByUploadedAtDesc(client.getId(), 2024))
            .hasSize(1);
}

@Test
void uploadMyDocument_unlinkedUserThrowsPortalNotLinked() {
    User stranger = newUser(8L, "noone@example.com"); // no clients row links to id=8
    MockMultipartFile file = new MockMultipartFile(
            "file", "a.pdf", "application/pdf", "x".getBytes());

    assertThatThrownBy(() -> service.uploadMyDocument(stranger, 2024, file))
            .isInstanceOf(PortalNotLinkedException.class);
}

@Test
void uploadMyDocument_rejectsBlockedExtension() {
    User me = newUser(7L, "jane@example.com");
    saveClient("jane@example.com", me.getId());

    MockMultipartFile file = new MockMultipartFile(
            "file", "evil.exe", "application/octet-stream", "x".getBytes());

    assertThatThrownBy(() -> service.uploadMyDocument(me, 2024, file))
            .isInstanceOf(FileValidationException.class)
            .hasMessageContaining(".exe");
}

@Test
void uploadMyDocument_rejectsOversize() {
    User me = newUser(7L, "jane@example.com");
    saveClient("jane@example.com", me.getId());

    byte[] big = new byte[(int) (11L * 1024 * 1024)];
    MockMultipartFile file = new MockMultipartFile(
            "file", "big.pdf", "application/pdf", big);

    assertThatThrownBy(() -> service.uploadMyDocument(me, 2024, file))
            .isInstanceOf(FileValidationException.class)
            .hasMessageContaining("exceeds max size");
}
```

Required imports (add to the existing file's import block):

```java
import com.gwhaitech.accountingfirm.client.dto.MyDocumentsDto;
import com.gwhaitech.accountingfirm.client.exception.DocumentNameConflictException;
import com.gwhaitech.accountingfirm.client.exception.FileValidationException;
import com.gwhaitech.accountingfirm.client.exception.PortalNotLinkedException;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import java.nio.file.Path;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
```

Wire `@TempDir` into the storage base dir: add to the class-level `@TestPropertySource(properties = { ..., "app.storage.upload-dir=${java.io.tmpdir}/me-doc-upload-test" })` if the file doesn't already isolate the upload root. If it can't be parametrized at class level, override the `LocalStorageService` bean with a `@TestConfiguration` that constructs one rooted at `tempDir`.

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && \
  ./mvnw test -Dtest=MeDocumentServiceTest
```

Expected: 5 new failures (`uploadMyDocument` not found). Paste the failure lines into `docs/log/2026-05-19.md`.

- [ ] **Step 3: Implement `uploadMyDocument`**

Edit `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/MeDocumentService.java`:

1. Add imports:
```java
import com.gwhaitech.accountingfirm.client.exception.DocumentNameConflictException;
import com.gwhaitech.accountingfirm.client.exception.PortalNotLinkedException;
import com.gwhaitech.accountingfirm.storage.FileUploadValidator;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;
```

2. Inject `FileUploadValidator` — update the constructor and add the field:

```java
private final FileUploadValidator fileUploadValidator;

public MeDocumentService(ClientRepository clientRepository,
                         ClientDocumentRepository documentRepository,
                         LocalStorageService storage,
                         FileUploadValidator fileUploadValidator) {
    this.clientRepository = clientRepository;
    this.documentRepository = documentRepository;
    this.storage = storage;
    this.fileUploadValidator = fileUploadValidator;
}
```

3. Add the method (place it after `listMyDocuments`):

```java
@Transactional
public MyDocumentsDto.Item uploadMyDocument(User user, int year, MultipartFile file) {
    Client client = clientRepository.findByUserId(user.getId())
            .orElseThrow(PortalNotLinkedException::new);

    String filename = file.getOriginalFilename();
    fileUploadValidator.validate(filename, file.getSize());

    documentRepository
            .findByClientIdAndYearAndFilename(client.getId(), year, filename)
            .ifPresent(existing -> { throw new DocumentNameConflictException(filename, year); });

    ClientDocument doc = new ClientDocument();
    doc.setClientId(client.getId());
    doc.setYear((short) year);
    doc.setFilename(filename);
    doc.setFilePath("clients/" + client.getId() + "/" + year + "/" + filename);
    doc.setMimeType(file.getContentType());
    doc.setSizeBytes(file.getSize());
    doc.setUploadedBy(user.getId());
    ClientDocument saved = documentRepository.save(doc);

    try {
        storage.store(client.getId(), year, filename, file.getInputStream());
    } catch (java.io.IOException e) {
        throw new java.io.UncheckedIOException(e);
    }

    return new MyDocumentsDto.Item(
            saved.getId(),
            (int) saved.getYear(),
            saved.getFilename(),
            saved.getMimeType(),
            saved.getSizeBytes(),
            saved.getUploadedAt() != null ? saved.getUploadedAt() : LocalDateTime.now(),
            true);
}
```

> Why DB-first then disk: `@Transactional` rolls back the row on file-write failure (matches `DocumentService.upload` ordering). The duplicate-check + insert happen inside the same transaction, so two simultaneous uploads of the same filename race on a unique-constraint-style guard — acceptable for v1; a hard DB unique index could be added later.

- [ ] **Step 4: Run the service tests and confirm green**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && \
  ./mvnw test -Dtest=MeDocumentServiceTest
```

Expected: all 5 new tests pass plus the existing list tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add backend/src/main/java/com/gwhaitech/accountingfirm/client/service/MeDocumentService.java \
        backend/src/test/java/com/gwhaitech/accountingfirm/client/service/MeDocumentServiceTest.java
git commit -m "$(cat <<'EOF'
feat(api): MeDocumentService.uploadMyDocument — client self-upload policy

Resolves the requesting user's linked Client, validates the file via
FileUploadValidator, rejects duplicate (clientId, year, filename) with
DocumentNameConflictException, and stores DB-row-first / file-second so
@Transactional rolls back on a write failure. Sets uploaded_by to the
authenticated user's id.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `MeDocumentController` POST endpoint

Wires the service into HTTP. Multipart limits are already enforced by Spring's `spring.servlet.multipart.max-file-size` at 10 MB — no config change.

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/client/controller/MeDocumentController.java`
- Create/extend: `backend/src/test/java/com/gwhaitech/accountingfirm/client/controller/MeDocumentControllerTest.java`

- [ ] **Step 1: Write the failing controller tests**

Create `backend/src/test/java/com/gwhaitech/accountingfirm/client/controller/MeDocumentControllerTest.java` (or extend if present):

```java
package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.dto.MyDocumentsDto;
import com.gwhaitech.accountingfirm.client.exception.DocumentNameConflictException;
import com.gwhaitech.accountingfirm.client.exception.PortalNotLinkedException;
import com.gwhaitech.accountingfirm.client.service.MeDocumentService;
import com.gwhaitech.accountingfirm.common.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MeDocumentController.class)
@Import(GlobalExceptionHandler.class)
class MeDocumentControllerTest {

    @Autowired MockMvc mvc;
    @MockBean MeDocumentService service;

    @BeforeEach
    void authAsUser() {
        User user = new User();
        user.setId(7L);
        user.setEmail("jane@example.com");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, "n/a", List.of()));
    }

    @Test
    @WithMockUser
    void upload_returns201WithNewItem() throws Exception {
        MyDocumentsDto.Item item = new MyDocumentsDto.Item(
                42L, 2024, "T4-2024.pdf", "application/pdf", 12345L,
                LocalDateTime.parse("2026-05-19T10:00:00"), true);
        Mockito.when(service.uploadMyDocument(any(), eq(2024), any())).thenReturn(item);

        MockMultipartFile file = new MockMultipartFile(
                "file", "T4-2024.pdf", "application/pdf", "hello".getBytes());

        mvc.perform(multipart("/api/me/documents")
                        .file(file)
                        .param("year", "2024"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.filename").value("T4-2024.pdf"))
                .andExpect(jsonPath("$.uploadedByMe").value(true));
    }

    @Test
    @WithMockUser
    void upload_returns409OnDuplicateName() throws Exception {
        Mockito.when(service.uploadMyDocument(any(), eq(2024), any()))
                .thenThrow(new DocumentNameConflictException("T4-2024.pdf", 2024));

        MockMultipartFile file = new MockMultipartFile(
                "file", "T4-2024.pdf", "application/pdf", "x".getBytes());

        mvc.perform(multipart("/api/me/documents")
                        .file(file)
                        .param("year", "2024"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.filename").value("T4-2024.pdf"))
                .andExpect(jsonPath("$.year").value(2024));
    }

    @Test
    @WithMockUser
    void upload_returns403WhenPortalNotLinked() throws Exception {
        Mockito.when(service.uploadMyDocument(any(), eq(2024), any()))
                .thenThrow(new PortalNotLinkedException());

        MockMultipartFile file = new MockMultipartFile(
                "file", "T4-2024.pdf", "application/pdf", "x".getBytes());

        mvc.perform(multipart("/api/me/documents")
                        .file(file)
                        .param("year", "2024"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("portal isn't set up")));
    }
}
```

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && \
  ./mvnw test -Dtest=MeDocumentControllerTest
```

Expected: 3 failures because `MeDocumentController` has no `POST /api/me/documents` mapping yet. Paste the failure line into `docs/log/2026-05-19.md`.

- [ ] **Step 3: Add the POST mapping**

Edit `backend/src/main/java/com/gwhaitech/accountingfirm/client/controller/MeDocumentController.java`:

1. Add imports:
```java
import com.gwhaitech.accountingfirm.client.dto.MyDocumentsDto;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
```

2. Add the handler (place it near the `@GetMapping` handlers):

```java
@PostMapping
public ResponseEntity<MyDocumentsDto.Item> upload(@RequestParam("year") int year,
                                                  @RequestParam("file") MultipartFile file,
                                                  Authentication authentication) {
    User user = resolveUser(authentication);
    MyDocumentsDto.Item item = meDocumentService.uploadMyDocument(user, year, file);
    return ResponseEntity.status(HttpStatus.CREATED).body(item);
}
```

- [ ] **Step 4: Run the controller tests and confirm green**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && \
  ./mvnw test -Dtest=MeDocumentControllerTest
```

Expected: all 3 tests pass.

- [ ] **Step 5: Run the full backend suite**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test
```

Expected: same baseline failure count as Pre-flight Step 1. No new failures.

- [ ] **Step 6: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add backend/src/main/java/com/gwhaitech/accountingfirm/client/controller/MeDocumentController.java \
        backend/src/test/java/com/gwhaitech/accountingfirm/client/controller/MeDocumentControllerTest.java
git commit -m "$(cat <<'EOF'
feat(api): POST /api/me/documents — client self-upload endpoint

Multipart endpoint on the existing /api/me/documents surface. Resolves
the authenticated user, hands off to MeDocumentService.uploadMyDocument,
and returns 201 with the newly-created MyDocumentsDto.Item.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Backend slice — code review + dev log

End of the backend slice. Snapshot what landed and address review findings before moving to the frontend.

- [ ] **Step 1: Run `superpowers:requesting-code-review` on the backend diff**

Invoke the skill with: scope = commits from Task 1 through Task 5 on this branch. Address all CRITICAL and HIGH findings inline before continuing. MEDIUM/LOW findings may be documented in the dev log for later if not addressed.

- [ ] **Step 2: Update `docs/log/2026-05-19.md`**

Append a section like:

```markdown
### 1. Client self-upload — backend

**Commit:** `<hash of Task 5 commit>` (range Task 1–5)

**Feature:**

- Extract FileUploadValidator @Component; DocumentService delegates.
- MyDocumentsDto.Item gains uploadedByMe; populated in listMyDocuments.
- DocumentNameConflictException (409) and PortalNotLinkedException (403) wired into GlobalExceptionHandler.
- MeDocumentService.uploadMyDocument: resolve linked client → validate → reject duplicate → save row → write file.
- POST /api/me/documents on MeDocumentController returns 201 with the new item.

**Code Review Findings, if any:**
| Severity | Issue | Fix |
|---|---|---|
| <fill in> | <fill in> | <fill in> |

**Tests:** <total backend tests passing> (<N newly added in this slice>)

**TDD Evidence:**

    <paste the RED failure lines you captured in Task 1, 2, 3, 4, 5>
```

- [ ] **Step 3: Commit the dev-log update**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add docs/log/2026-05-19.md
git commit -m "$(cat <<'EOF'
docs(log): client self-upload — backend slice complete

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Frontend — `MyDocumentsService.upload`

Thin HTTP wrapper. Built before the component so the component can mock it cleanly.

**Files:**
- Modify: `frontend/src/app/core/services/my-documents.service.ts`
- Modify: `frontend/src/app/core/services/my-documents.service.spec.ts` (create if absent)

- [ ] **Step 1: Write the failing service test**

Create (or extend) `frontend/src/app/core/services/my-documents.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MyDocumentsService } from './my-documents.service';
import { MyDocumentItem } from '../models/my-documents';

describe('MyDocumentsService.upload', () => {
  let service: MyDocumentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MyDocumentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('POSTs FormData with the file part to /api/me/documents?year=YYYY', () => {
    const file = new File(['hello'], 'T4-2024.pdf', { type: 'application/pdf' });
    const item: MyDocumentItem = {
      id: 42, year: 2024, filename: 'T4-2024.pdf',
      mimeType: 'application/pdf', sizeBytes: 5, uploadedAt: '2026-05-19T10:00:00',
      uploadedByMe: true,
    };

    let received: MyDocumentItem | undefined;
    service.upload(2024, file).subscribe(r => received = r);

    const req = httpMock.expectOne('/api/me/documents?year=2024');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    const body = req.request.body as FormData;
    const part = body.get('file') as File;
    expect(part.name).toBe('T4-2024.pdf');
    req.flush(item);

    expect(received).toEqual(item);
  });

  it('propagates HTTP errors to the subscriber', () => {
    const file = new File(['x'], 'dup.pdf', { type: 'application/pdf' });

    let status = 0;
    service.upload(2024, file).subscribe({
      next: () => {},
      error: (err) => { status = err.status; },
    });

    httpMock.expectOne('/api/me/documents?year=2024').flush(
      { message: 'duplicate', filename: 'dup.pdf', year: 2024 },
      { status: 409, statusText: 'Conflict' });

    expect(status).toBe(409);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && \
  npx ng test --no-watch --include='**/my-documents.service.spec.ts'
```

Expected: failure — `service.upload is not a function`. Paste the line into `docs/log/2026-05-19.md`.

- [ ] **Step 3: Add `upload` to the service**

Edit `frontend/src/app/core/services/my-documents.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MyDocumentItem, MyDocumentsResponse } from '../models/my-documents';

@Injectable({ providedIn: 'root' })
export class MyDocumentsService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<MyDocumentsResponse> {
    return this.http.get<MyDocumentsResponse>('/api/me/documents');
  }

  upload(year: number, file: File): Observable<MyDocumentItem> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<MyDocumentItem>(`/api/me/documents?year=${year}`, form);
  }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && \
  npx ng test --no-watch --include='**/my-documents.service.spec.ts'
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add frontend/src/app/core/services/my-documents.service.ts \
        frontend/src/app/core/services/my-documents.service.spec.ts
git commit -m "$(cat <<'EOF'
feat(frontend): MyDocumentsService.upload — POST /api/me/documents

Sends multipart FormData with year as a query param. Returns the
created MyDocumentItem (including uploadedByMe).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `DocumentsComponent` — Upload UI

The biggest single task: Upload button in the controls row, hidden file input, on-success append, on-error snackbar mapping, "Uploaded by you" chip, and empty-state year picker + Upload prompt. Cover with Vitest specs.

**Files:**
- Modify: `frontend/src/app/features/client-portal/documents/documents.component.ts`
- Modify: `frontend/src/app/features/client-portal/documents/documents.component.html`
- Modify: `frontend/src/app/features/client-portal/documents/documents.component.css`
- Modify: `frontend/src/app/features/client-portal/documents/documents.component.spec.ts`

- [ ] **Step 1: Write the failing component tests**

Append to `documents.component.spec.ts`. Place imports at the top of the existing file:

```ts
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
```

Add a fresh `describe` block (or extend the existing one) — copy-paste:

```ts
describe('DocumentsComponent — upload', () => {
  let fixture: ComponentFixture<DocumentsComponent>;
  let component: DocumentsComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsComponent, MatSnackBarModule],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(DocumentsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('renders the Upload button in the controls row when documents are present', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true, clientName: 'Jane', documents: [
        { id: 1, year: 2024, filename: 'T4.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-12T10:00:00', uploadedByMe: false },
      ]});
    await fixture.whenStable();
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button.upload-btn');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('Upload');
  });

  it('renders "Uploaded by you" chip on uploadedByMe rows only', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true, clientName: 'Jane', documents: [
        { id: 1, year: 2024, filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-12T10:00:00', uploadedByMe: true },
        { id: 2, year: 2024, filename: 'b.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-12T10:00:00', uploadedByMe: false },
      ]});
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.doc-row');
    expect(rows[0].querySelector('.badge-you')).not.toBeNull();
    expect(rows[1].querySelector('.badge-you')).toBeNull();
  });

  it('upload success appends the new item and clears the uploading flag', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true, clientName: 'Jane', documents: [
        { id: 1, year: 2024, filename: 'T4.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-12T10:00:00', uploadedByMe: false },
      ]});
    await fixture.whenStable();
    fixture.detectChanges();

    // Simulate file selection
    const file = new File(['hello'], 'Receipts-2024.pdf', { type: 'application/pdf' });
    component.onFileSelected({ target: { files: [file], value: '' } } as any);

    const req = httpMock.expectOne('/api/me/documents?year=2024');
    req.flush({
      id: 99, year: 2024, filename: 'Receipts-2024.pdf',
      mimeType: 'application/pdf', sizeBytes: 5, uploadedAt: '2026-05-19T10:00:00',
      uploadedByMe: true,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.uploading()).toBe(false);
    const rows = fixture.nativeElement.querySelectorAll('.doc-row');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Receipts-2024.pdf');
  });

  it('upload 409 surfaces the duplicate error and does not append', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true, clientName: 'Jane', documents: [
        { id: 1, year: 2024, filename: 'dup.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-12T10:00:00', uploadedByMe: false },
      ]});
    await fixture.whenStable();
    fixture.detectChanges();

    // Capture snackbar via spy
    const snackSpy = vi.spyOn((component as any).snackBar, 'open');

    const file = new File(['x'], 'dup.pdf', { type: 'application/pdf' });
    component.onFileSelected({ target: { files: [file], value: '' } } as any);

    httpMock.expectOne('/api/me/documents?year=2024').flush(
      { message: 'A file named "dup.pdf" already exists for 2024.', filename: 'dup.pdf', year: 2024 },
      { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.uploading()).toBe(false);
    const rows = fixture.nativeElement.querySelectorAll('.doc-row');
    expect(rows.length).toBe(1); // unchanged
    expect(snackSpy).toHaveBeenCalled();
    expect(snackSpy.mock.calls[0][0]).toContain('already exists');
  });

  it('empty state (linked, zero docs) renders a year picker and Upload button', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true, clientName: 'Jane', documents: [],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('select.empty-year-select')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button.empty-upload-btn')).not.toBeNull();
  });
});
```

(`vi.spyOn` is from Vitest — already configured in the project.)

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && \
  npx ng test --no-watch --include='**/documents.component.spec.ts'
```

Expected: 5 new failures (missing `.upload-btn`, `.badge-you`, `onFileSelected`, `uploading` signal, empty-state controls). Paste the failure lines into `docs/log/2026-05-19.md`.

- [ ] **Step 3: Update the component class**

Replace `frontend/src/app/features/client-portal/documents/documents.component.ts` with:

```ts
import { Component, OnInit, ViewChild, ElementRef, computed, signal, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { MyDocumentsService } from '../../../core/services/my-documents.service';
import { MyDocumentItem, MyDocumentsResponse } from '../../../core/models/my-documents';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css',
})
export class DocumentsComponent implements OnInit {
  private myDocs = inject(MyDocumentsService);
  private snackBar = inject(MatSnackBar);

  response = signal<MyDocumentsResponse | null>(null);
  selectedYear = signal<number | null>(null);
  uploading = signal<boolean>(false);
  emptyStateYear = signal<number>(new Date().getFullYear());

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  years = computed<number[]>(() => {
    const r = this.response();
    if (!r) return [];
    const uniq = Array.from(new Set(r.documents.map(d => d.year)));
    return uniq.sort((a, b) => b - a);
  });

  filteredDocs = computed<MyDocumentItem[]>(() => {
    const r = this.response();
    const y = this.selectedYear();
    if (!r || y == null) return [];
    return r.documents.filter(d => d.year === y);
  });

  // Year options for the empty-state picker: current year + 4 previous.
  emptyStateYearOptions = computed<number[]>(() => {
    const cur = new Date().getFullYear();
    return [cur, cur - 1, cur - 2, cur - 3, cur - 4];
  });

  navigate: (url: string) => void = (url) => { window.location.href = url; };

  ngOnInit(): void {
    this.myDocs.getAll().subscribe({
      next: (res) => {
        this.response.set(res);
        const ys = this.years();
        if (ys.length > 0) this.selectedYear.set(ys[0]);
      },
      error: () => this.snackBar.open('Could not load your documents. Please try again.', 'OK'),
    });
  }

  onYearChange(value: string): void {
    this.selectedYear.set(Number(value));
  }

  onEmptyYearChange(value: string): void {
    this.emptyStateYear.set(Number(value));
  }

  onUploadClick(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const year = this.selectedYear() ?? this.emptyStateYear();
    this.uploading.set(true);

    this.myDocs.upload(year, file)
      .pipe(finalize(() => {
        this.uploading.set(false);
        if (input) input.value = '';
      }))
      .subscribe({
        next: (item) => {
          const current = this.response() ?? { linked: true, clientName: null, documents: [] };
          const updated: MyDocumentsResponse = {
            ...current,
            documents: [...current.documents, item],
          };
          this.response.set(updated);
          if (this.selectedYear() == null) this.selectedYear.set(item.year);
          this.snackBar.open(`Uploaded ${item.filename}.`, 'OK', { duration: 3000 });
        },
        error: (err: HttpErrorResponse) => {
          this.snackBar.open(this.errorMessageFor(err, file.name, year), 'OK');
        },
      });
  }

  private errorMessageFor(err: HttpErrorResponse, filename: string, year: number): string {
    const serverMessage = err?.error?.message;
    switch (err.status) {
      case 400:
        return serverMessage ?? 'That file could not be uploaded.';
      case 403:
        return serverMessage ?? "Your portal isn't set up yet. Please contact GWH Accounting.";
      case 409:
        return serverMessage ?? `A file named "${filename}" already exists for ${year}. Please rename and try again.`;
      case 413:
        return 'File is too large. Maximum size is 10 MB.';
      default:
        return 'Upload failed. Please try again.';
    }
  }

  downloadYearZip(): void {
    const y = this.selectedYear();
    if (y == null) return;
    this.navigate(`/api/me/documents/zip?year=${y}`);
  }

  downloadHref(docId: number): string {
    return `/api/me/documents/${docId}/download`;
  }

  formatBytes(bytes: number | null): string {
    if (bytes == null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatUploadedAt(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
```

- [ ] **Step 4: Update the template**

Replace `frontend/src/app/features/client-portal/documents/documents.component.html` with:

```html
<div class="documents-page">
  <header class="page-header">
    <h1>My Documents</h1>
    <p class="subtitle">Documents shared with you by GWH Accounting</p>
  </header>

  @if (response() === null) {
    <p class="loading">Loading…</p>
  } @else if (!response()!.linked) {
    <div class="empty-state">
      <mat-icon>info_outline</mat-icon>
      <p>Your portal isn't set up yet. Please contact GWH Accounting to get started.</p>
    </div>
  } @else if (response()!.documents.length === 0) {
    <div class="empty-state">
      <mat-icon>folder_open</mat-icon>
      <p>No documents yet — upload your first one below.</p>
      <div class="empty-controls">
        <label class="year-label">
          Tax Year:
          <select class="empty-year-select" (change)="onEmptyYearChange($any($event.target).value)">
            @for (y of emptyStateYearOptions(); track y) {
              <option [value]="y" [selected]="y === emptyStateYear()">{{ y }}</option>
            }
          </select>
        </label>
        <button mat-flat-button color="primary"
                class="empty-upload-btn"
                [disabled]="uploading()"
                (click)="onUploadClick()">
          <mat-icon>upload</mat-icon>
          {{ uploading() ? 'Uploading…' : 'Upload a document' }}
        </button>
      </div>
    </div>
  } @else {
    <div class="controls">
      <label class="year-label">
        Tax Year:
        <select class="year-select" (change)="onYearChange($any($event.target).value)">
          @for (y of years(); track y) {
            <option [value]="y" [selected]="y === selectedYear()">{{ y }}</option>
          }
        </select>
      </label>
      <span class="doc-count">· {{ filteredDocs().length }} document{{ filteredDocs().length === 1 ? '' : 's' }}</span>

      <div class="spacer"></div>

      <button mat-stroked-button
              class="upload-btn"
              [disabled]="uploading() || selectedYear() == null"
              (click)="onUploadClick()">
        <mat-icon>upload</mat-icon>
        {{ uploading() ? 'Uploading…' : 'Upload' }}
      </button>

      <button mat-flat-button color="primary"
              class="download-all-btn"
              [disabled]="filteredDocs().length === 0"
              (click)="downloadYearZip()">
        <mat-icon>download</mat-icon>
        Download All for {{ selectedYear() }}
      </button>
    </div>

    @if (filteredDocs().length === 0) {
      <div class="empty-state">
        <mat-icon>folder_open</mat-icon>
        <p>No documents for {{ selectedYear() }}. Try a different year above.</p>
      </div>
    } @else {
      <div class="doc-list">
        @for (doc of filteredDocs(); track doc.id) {
          <div class="doc-row">
            <mat-icon class="doc-icon">description</mat-icon>
            <div class="doc-info">
              <div class="doc-filename">{{ doc.filename }}</div>
              <div class="doc-meta">
                {{ doc.mimeType || 'file' }} · {{ formatBytes(doc.sizeBytes) }} · uploaded {{ formatUploadedAt(doc.uploadedAt) }}
              </div>
              @if (doc.uploadedByMe) {
                <mat-chip class="badge-you" disableRipple>Uploaded by you</mat-chip>
              }
            </div>
            <a mat-stroked-button class="download-link" [attr.href]="downloadHref(doc.id)" download>
              Download
            </a>
          </div>
        }
      </div>
    }
  }

  <input type="file" hidden #fileInput (change)="onFileSelected($event)">
</div>
```

> Notes on the template:
> - The hidden `<input type="file">` lives once at the bottom of `.documents-page` so the same `@ViewChild` works whether the user is in the empty state or the populated state.
> - The empty-state branch only fires when `linked === true && documents.length === 0`. The pre-existing `linked: false` branch is unchanged.

- [ ] **Step 5: Update the CSS**

Append to `frontend/src/app/features/client-portal/documents/documents.component.css`:

```css
.upload-btn[disabled],
.empty-upload-btn[disabled] {
  opacity: 0.4;
}

.badge-you {
  margin-top: 6px;
  font-size: 11px;
  height: 22px;
  line-height: 22px;
  padding: 0 8px;
  background: #e0f2fe;
  color: #0369a1;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
}

.empty-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.empty-year-select {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 14px;
  background: white;
}
```

(Colours pulled from the existing slate/sky palette already used on this page — not introducing a new token.)

- [ ] **Step 6: Run the component tests and confirm green**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && \
  npx ng test --no-watch --include='**/documents.component.spec.ts'
```

Expected: all tests pass (the 5 new ones plus the existing list/year tests).

- [ ] **Step 7: Run the full frontend suite**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && \
  npx ng test --no-watch
```

Expected: all green.

- [ ] **Step 8: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add frontend/src/app/features/client-portal/documents/documents.component.ts \
        frontend/src/app/features/client-portal/documents/documents.component.html \
        frontend/src/app/features/client-portal/documents/documents.component.css \
        frontend/src/app/features/client-portal/documents/documents.component.spec.ts
git commit -m "$(cat <<'EOF'
feat(client-portal): client self-upload UI on /portal/documents

Upload button in the controls row uses the currently-selected tax year.
Empty-state branch gets its own year picker and Upload prompt. Uploaded
rows render an "Uploaded by you" chip. Errors mapped to specific snackbar
messages by HTTP status (400/403/409/413/default).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Frontend slice — code review + dev log

- [ ] **Step 1: Run `superpowers:requesting-code-review` on the frontend diff**

Scope = Task 7 + Task 8 commits. Address CRITICAL/HIGH findings inline before continuing.

- [ ] **Step 2: Append to `docs/log/2026-05-19.md`**

```markdown
### 2. Client self-upload — frontend

**Commit:** `<hash of Task 8 commit>` (range Task 7–8)

**Feature:**

- MyDocumentsService.upload posts FormData to /api/me/documents?year=YYYY.
- DocumentsComponent: Upload button in controls row; hidden file input; on success appends item, snackbars; on error, status-specific snackbars; "Uploaded by you" chip on uploadedByMe rows; empty-state year picker + Upload prompt.

**Code Review Findings, if any:**
| Severity | Issue | Fix |
|---|---|---|

**Tests:** <total frontend tests> (<N newly added>)

**TDD Evidence:**

    <paste RED failure lines from Tasks 7 and 8>
```

- [ ] **Step 3: Commit the dev-log update**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add docs/log/2026-05-19.md
git commit -m "$(cat <<'EOF'
docs(log): client self-upload — frontend slice complete

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: E2E Playwright spec

Final group — UI surface touched, so Playwright coverage is mandatory per the schema. Two specs: happy path (upload → row appears with chip) and duplicate path (409 → snackbar, no new row).

**Files:**
- Create: `e2e/portal-documents-upload.spec.ts`
- Create fixture: `e2e/fixtures/upload-sample.pdf` (any small PDF — generated below)

- [ ] **Step 1: Start both dev servers**

```bash
# Terminal 1
cd /Users/gwang/Develop/superpowers_test/accounting-firm && ./start.sh

# Terminal 2
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npm start
```

Wait for `:8080` and `:4200` to come up.

- [ ] **Step 2: Create the fixture PDF**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
mkdir -p e2e/fixtures
printf '%%PDF-1.1\n%%fixture\n%%%%EOF\n' > e2e/fixtures/upload-sample.pdf
```

(A minimal valid-looking PDF stub is enough — we're not parsing it, just shipping bytes.)

- [ ] **Step 3: Create the spec**

Create `e2e/portal-documents-upload.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import * as path from 'path';

async function fakeAuth(page) {
  await page.context().addCookies([{
    name: 'jwt',
    value: 'mock.jwt.token',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
  }]);
  await page.route('**/api/auth/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 7, email: 'jane@example.com', name: 'Jane Smith', role: 'USER' }),
  }));
}

const initial = {
  linked: true,
  clientName: 'Jane Smith',
  documents: [
    { id: 1, year: 2024, filename: 'Tax-Return-2024.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-12T10:00:00', uploadedByMe: false },
  ],
};

const fixturePath = path.resolve(__dirname, 'fixtures/upload-sample.pdf');

test.describe('/portal/documents — upload', () => {

  test('happy path: upload appears with "Uploaded by you" chip', async ({ page }) => {
    await fakeAuth(page);

    // Initial list
    await page.route('**/api/me/documents', route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(initial) });
      }
      // POST: return the new item
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 99, year: 2024, filename: 'upload-sample.pdf',
          mimeType: 'application/pdf', sizeBytes: 50,
          uploadedAt: '2026-05-19T10:00:00', uploadedByMe: true,
        }),
      });
    });

    await page.goto('/portal/documents');
    await expect(page.locator('button.upload-btn')).toBeVisible();

    // Click Upload, then set the file chooser
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('button.upload-btn').click(),
    ]);
    await fileChooser.setFiles(fixturePath);

    // The new row appears with the chip
    const newRow = page.locator('.doc-row', { hasText: 'upload-sample.pdf' });
    await expect(newRow).toBeVisible();
    await expect(newRow.locator('.badge-you')).toHaveText(/Uploaded by you/);
  });

  test('duplicate filename: snackbar shows the error and no row is added', async ({ page }) => {
    await fakeAuth(page);

    await page.route('**/api/me/documents', route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(initial) });
      }
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'A file named "upload-sample.pdf" already exists for 2024.',
          filename: 'upload-sample.pdf',
          year: 2024,
        }),
      });
    });

    await page.goto('/portal/documents');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('button.upload-btn').click(),
    ]);
    await fileChooser.setFiles(fixturePath);

    await expect(page.locator('mat-snack-bar-container, .mat-mdc-snack-bar-container'))
        .toContainText('already exists');

    // Still only the original row
    await expect(page.locator('.doc-row')).toHaveCount(1);
  });

});
```

- [ ] **Step 4: Run the new specs and confirm green**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/e2e && \
  npx playwright test portal-documents-upload
```

Expected: 2 tests pass. If the AuthGuard refuses, mirror the `await page.waitForResponse(...)` workaround documented at the end of `2026-05-15-client-documents-view.md` Task 11.

- [ ] **Step 5: Run the full E2E suite to check for regressions**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/e2e && \
  npx playwright test
```

Expected: pre-existing failures (if any — note them from the baseline) unchanged. No new regressions.

- [ ] **Step 6: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add e2e/portal-documents-upload.spec.ts e2e/fixtures/upload-sample.pdf
git commit -m "$(cat <<'EOF'
test(e2e): /portal/documents upload — happy path and duplicate-name error

Two Playwright specs covering the new client self-upload flow with
mocked /api/me/documents responses (no DB seed required).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Manual browser smoke test

Per CLAUDE.md: "For UI or frontend changes, start the dev server and use the feature in a browser before reporting the task as complete." Verification only — no commits.

- [ ] **Step 1: Both servers running** (backend `:8080`, frontend `:4200`)

- [ ] **Step 2: Seed a client linked to your login email**

In psql (or any SQL client) connected to the local `accounting_firm` DB:

```sql
INSERT INTO clients (user_id, name, email, phone) VALUES
  (NULL, 'Smoke Test Client', 'YOUR_LOGIN_EMAIL', '555-0100');
```

Replace `YOUR_LOGIN_EMAIL` with the email you actually log in with. Log out and log back in to trigger `UserClientLinkService.linkIfPossible`; confirm `clients.user_id` is now your user id.

- [ ] **Step 3: Visit `/portal/documents`**

Empty-state path:
- "No documents yet — upload your first one below." is visible.
- Year picker defaults to current year (`2026`).
- Click **Upload a document** → choose any small PDF.
- Row appears with **Uploaded by you** chip. The controls row replaces the empty state.

- [ ] **Step 4: Upload a second file**

- Click **Upload** in the controls row.
- Pick a different file → it appears in the list.

- [ ] **Step 5: Duplicate-name error**

- Click **Upload** → pick a file with the SAME name as one already in the list for the current year.
- Snackbar shows: `A file named "<name>" already exists for <year>. Please rename and try again.`
- No second row appears.

- [ ] **Step 6: Year switch**

- Change the year dropdown to a different year (e.g. 2025).
- Upload a file → it lands tagged with 2025.

- [ ] **Step 7: Download verification**

- Click **Download** on an uploaded row → file downloads.
- Click **Download All for {year}** → ZIP downloads and contains the uploaded files.

If any step fails, fix before continuing.

---

## Task 12: Final verification + dev log + completion review

Final code review + the project's full-suite verification per `superpowers:verification-before-completion`.

- [ ] **Step 1: Run `superpowers:requesting-code-review` on the full branch diff**

Scope = every commit on this branch since `main`. Address CRITICAL/HIGH findings inline. Re-run if anything was changed.

- [ ] **Step 2: Run `superpowers:verification-before-completion`**

The skill will execute the verification checklist. Equivalent commands if running manually:

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npx ng test --no-watch
cd /Users/gwang/Develop/superpowers_test/accounting-firm/e2e && npx playwright test
```

Expected: same baseline failure counts as Pre-flight. No new failures. No stray `console.log`/`System.out.println`/`println!`/debugger statements — grep:

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git diff main -- '*.ts' '*.html' | grep -nE "console\\.(log|error|warn)|debugger" && echo "FIX: stray debug output" || echo "no stray output"
git diff main -- '*.java' | grep -nE "System\\.out|printStackTrace" && echo "FIX: stray debug output" || echo "no stray output"
```

If anything shows up, remove it and re-run.

- [ ] **Step 3: Final dev-log update**

Append the final section to `docs/log/2026-05-19.md`:

```markdown
### 3. Client self-upload — E2E and verification

**Commit:** `<hash of Task 10 commit>`

**Feature:**

- Playwright spec e2e/portal-documents-upload.spec.ts covers happy path + duplicate-name error.
- Manual smoke test passed: empty-state upload, populated-state upload, duplicate snackbar, year switch, download, year ZIP.

**Code Review Findings, if any:**
| Severity | Issue | Fix |
|---|---|---|

**Tests:** <final total counts: backend / frontend / e2e>

### To Do

- [ ] (Optional) Add a hard DB unique index on (client_id, year, filename) to defend the duplicate-rejection guard against the simultaneous-upload race.
- [ ] (Tracked separately) Authorization hardening of /api/clients/{clientId}/documents — still gated only by authentication.
```

- [ ] **Step 4: Commit the final dev-log entry**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add docs/log/2026-05-19.md
git commit -m "$(cat <<'EOF'
docs(log): client self-upload — E2E and verification complete

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Review git log**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm && git log --oneline -20
```

Expected: a focused stack of commits, each scoped to one task plus three dev-log commits.

- [ ] **Step 6: Done**

Branch is ready for review. No final commit beyond the dev log. If everything is green, hand off.

---

## Notes for the implementer

- **No DB migration.** `client_documents.uploaded_by` is already in V6. The duplicate-rejection guard is in Java only; if you want to harden it against a simultaneous-upload race, that's the "Optional" follow-up in the final dev log — not in this plan's scope.
- **Storage layout unchanged.** `LocalStorageService.store(clientId, year, filename, in)` already writes to `clients/<id>/<year>/<filename>`. Do not change it.
- **Why DB-row-first, then file-second:** matches `DocumentService.upload`. If the file write throws, `@Transactional` rolls back the row. The reverse ordering would leave an orphan file on disk.
- **Authentication.** The endpoint lives on `/api/me/**` which is already in the authenticated surface — no SecurityFilterChain change is needed. The user is resolved from `Authentication.getPrincipal()` (same pattern as the existing `GET /api/me/documents`); a client cannot upload to anyone else's `client_id` because the controller never accepts a `clientId` parameter.
- **The "navigate" indirection** on `DocumentsComponent` is a test seam. Leave it.
- **CSS chip colours** are sourced from the slate/sky palette already used on the page — no new design tokens added. If `docs/ui-design-guide.md` defines a canonical "informational chip" treatment, prefer that and remove the inline values from the CSS.
- **TODO on `/api/clients/{clientId}/documents`** stays as documented in `DocumentController.java`. That authorization gap is tracked separately and is intentionally out of scope for this change.
