# Design — Client portal: upload my own documents

**Date:** 2026-05-19
**Status:** Approved (brainstorming) — ready for implementation planning

## Summary

A logged-in client can upload their own documents (e.g. T4 slips, receipts) to their accountant from the existing `/portal/documents` page. Uploaded files appear in the same year-filtered list as documents the firm has shared with the client, distinguished by an "Uploaded by you" chip. The upload is tagged with the tax year currently selected in the page's filter dropdown. Duplicate filenames within a `(clientId, year)` are rejected — no silent overwrite.

This change adds:

- A new client-self endpoint `POST /api/me/documents?year=YYYY` (multipart `file`) that writes to the same `client_documents` table and `uploads/clients/<clientId>/<year>/` directory as the existing staff-side upload.
- An `uploadedByMe: boolean` field on the existing `MyDocumentsDto.Item` record (backend) and the matching `MyDocumentItem` interface (frontend) returned by `GET /api/me/documents`, so the frontend can render the "Uploaded by you" chip on the rows the current user produced.
- An **Upload** button in the controls row of `/portal/documents` (next to "Download All for {year}"), and an upload prompt with its own year picker for the empty-state path (client has zero documents yet).
- A shared `FileUploadValidator` component, extracted from `DocumentService`'s three private validators, so both the staff and the client-self upload paths reuse one definition of "valid filename, allowed extension, allowed size."

## Goals

- Logged-in clients can send documents to the firm without email or out-of-band tools.
- Uploaded files are immediately visible in the same year-filtered list the client already uses for download.
- Accidental overwrite of a firm-shared document (e.g. a finished tax return) is impossible — duplicates are rejected with an actionable message.
- Behavior of the existing staff-side `POST /api/clients/{clientId}/documents` endpoint is unchanged (it still overwrites on duplicate). Only the validation helpers are shared.

## Non-goals

- Multi-file / drag-and-drop upload. One file per upload action.
- Categorization, tags, notes, or any metadata beyond filename + year.
- Notifications to the firm when a client uploads (e.g. email to staff). Out of scope for this change.
- A separate "incoming" pool / staff review queue. Client uploads land directly in the shared documents pool.
- Mobile-first / responsive redesign of the Documents page beyond what the existing layout already handles.
- Authorization hardening of `/api/clients/{clientId}/documents` — still tracked separately (see the existing TODO in `DocumentController.java`).
- DB schema changes. The existing `client_documents` table already has `uploaded_by`; no migration is needed.

## Constraints carried over from existing storage config

- Max file size: **10 MB** (`app.storage.max-file-size-mb`, also enforced at servlet multipart layer).
- Max filename length: **100** (`app.storage.max-filename-length`).
- Blocked extensions: **`exe`, `js`** (`app.storage.blocked-extensions`).
- On-disk path: `uploads/clients/<clientId>/<year>/<filename>` (unchanged).

## User flow

### Happy path

1. Client logs in and navigates to `/portal/documents`. Tax year 2024 is auto-selected (most recent year with documents).
2. Client clicks the **Upload** button in the controls row. Native OS file picker opens.
3. Client selects `T4-2024.pdf`. Button label changes to "Uploading…" and is disabled.
4. Browser POSTs `multipart/form-data` to `/api/me/documents?year=2024` with the file part named `file`.
5. Server: resolves the authenticated user → resolves the user's linked `Client` → validates the file → checks `(clientId, 2024, "T4-2024.pdf")` is not already in `client_documents` → inserts a new row with `uploaded_by = user.id` → writes the file → returns the new `MyDocumentsDto.Item` with `uploadedByMe: true`.
6. Frontend appends the item to its in-memory list (signal update), re-renders, opens a snackbar `Uploaded T4-2024.pdf.` (auto-dismiss).

### Empty-state path

When the client has no documents yet, the page currently shows `No documents have been shared with you yet`. We replace that with:

- The same friendly message ("No documents yet — upload your first one below.")
- A small inline year `<select>` defaulting to the current calendar year and listing the current year plus the four previous years.
- An **Upload** button using the same hidden file input.

The empty-state year is tracked in a separate signal `emptyStateYear` so it doesn't fight the main `selectedYear` once documents start appearing and the filter dropdown becomes populated.

### Error paths

See "Error handling" below.

## Architecture

```
┌────────────────────────────┐        POST /api/me/documents?year=YYYY
│ DocumentsComponent         │  ───── multipart: file ─────────────▶
│ (frontend, /portal/...)    │
└──────────┬─────────────────┘
           │
           │  MyDocumentsService.upload(year, file)
           ▼
┌────────────────────────────┐
│ MeDocumentController       │
│   @PostMapping             │
└──────────┬─────────────────┘
           │ uploadMyDocument(user, year, file)
           ▼
┌────────────────────────────┐
│ MeDocumentService          │
│   ├─ resolve linked Client │ ──── ClientRepository.findByUserId
│   ├─ FileUploadValidator   │ ──── (shared with DocumentService)
│   ├─ duplicate check       │ ──── ClientDocumentRepository
│   │     .findByClientIdAndYearAndFilename
│   ├─ save ClientDocument   │ ──── ClientDocumentRepository.save
│   └─ write file            │ ──── LocalStorageService.store
└────────────────────────────┘
```

### Component boundaries

- **`MeDocumentController`** — HTTP surface. Resolves `Authentication` → `User`. Delegates to `MeDocumentService`. Knows nothing about validation, storage, or DB layout.
- **`MeDocumentService`** — Owns the client-self upload policy: never overwrite, always set `uploaded_by` to the requesting user's id. Reuses `FileUploadValidator` and `LocalStorageService`. Returns DTOs, not entities.
- **`FileUploadValidator`** (new `@Component` in `storage/`) — Pure validation of filename/extension/size. Throws `FileValidationException`. Used by both `MeDocumentService` and `DocumentService`.
- **`LocalStorageService`** — Unchanged. Writes/reads bytes on disk.
- **`DocumentService`** — Staff-side policy: overwrite on duplicate. Validation logic delegated to `FileUploadValidator`. No other behavior change.

## Backend changes

### New files

- `backend/src/main/java/com/gwhaitech/accountingfirm/storage/FileUploadValidator.java`
  - `@Component` with `void validate(String filename, long sizeBytes)`.
  - Body lifted verbatim from `DocumentService.validateFilename`, `validateExtension`, `validateSize`.
  - Constructor-injects `StorageProperties`.
- `backend/src/main/java/com/gwhaitech/accountingfirm/client/exception/DocumentNameConflictException.java`
  - Runtime exception. Carries `String filename` and `int year`.
  - Mapped to HTTP 409 with body `{ "message": "...", "filename": "...", "year": YYYY }` in the global exception handler.
- `backend/src/main/java/com/gwhaitech/accountingfirm/client/exception/PortalNotLinkedException.java`
  - Runtime exception. Thrown by `MeDocumentService.uploadMyDocument` when the authenticated user has no linked `clients` row.
  - Mapped to HTTP 403 with body `{ "message": "Your portal isn't set up yet." }`.

> Note: the existing `GET /api/me/documents` returns `linked: false` rather than throwing, because the list view has a graceful UI for the unlinked state. The upload path treats it as a hard error because there's nothing to attach the file to.

### Modified files

- **`MeDocumentService.java`**
  - Inject `ClientRepository`, `ClientDocumentRepository`, `LocalStorageService`, `FileUploadValidator`.
  - New method:
    ```java
    @Transactional
    public MyDocumentsDto.Item uploadMyDocument(User user, int year, MultipartFile file) {
        Client client = clientRepository.findByUserId(user.getId())
                .orElseThrow(PortalNotLinkedException::new);
        String filename = file.getOriginalFilename();
        fileUploadValidator.validate(filename, file.getSize());

        clientDocumentRepository
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
        ClientDocument saved = clientDocumentRepository.save(doc);

        try {
            localStorageService.store(client.getId(), year, filename, file.getInputStream());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return toItem(saved, user.getId());
    }
    ```
  - Update `listMyDocuments(User)` so each `MyDocumentsDto.Item` has `uploadedByMe = user.getId().equals(doc.getUploadedBy())`.

- **`MyDocumentsDto.Item`** (nested record in `MyDocumentsDto`) — add `boolean uploadedByMe`. All existing construction sites updated.

- **`MeDocumentController.java`** — add:
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

- **`DocumentService.java`** — replace the three private `validateXxx` methods with delegation to `FileUploadValidator`. No behavior change for the staff-side path.

- **Global exception handler** (whichever class maps `FileValidationException` today) — add mappings for `DocumentNameConflictException` → 409 and `PortalNotLinkedException` → 403.

### No migration

`client_documents` already has `client_id`, `year`, `filename`, `file_path`, `mime_type`, `size_bytes`, `uploaded_by`, `uploaded_at`. No new columns. No new indexes — the existing lookup `findByClientIdAndYearAndFilename` is the same query used by the staff-side path.

## Frontend changes

### Modified files

- **`frontend/src/app/core/models/my-documents.ts`**
  - Add `uploadedByMe: boolean` to `MyDocumentItem`.

- **`frontend/src/app/core/services/my-documents.service.ts`**
  - Add:
    ```ts
    upload(year: number, file: File): Observable<MyDocumentItem> {
      const form = new FormData();
      form.append('file', file);
      return this.http.post<MyDocumentItem>(`/api/me/documents?year=${year}`, form);
    }
    ```
    (`MyDocumentItem` is the frontend interface name; the backend serializes `MyDocumentsDto.Item` with the same JSON shape plus the new `uploadedByMe` field.)
    ```ts
    ```

- **`documents.component.ts`**
  - New state: `uploading = signal<boolean>(false)`, `emptyStateYear = signal<number>(new Date().getFullYear())`.
  - `@ViewChild('fileInput')` for the hidden `<input type="file">`.
  - `onUploadClick()` → `fileInput.nativeElement.click()`.
  - `onFileSelected(event)`:
    1. Pull `file` from the input. Bail if missing.
    2. Determine `year`: use `selectedYear()` when the list has documents, else `emptyStateYear()`.
    3. Set `uploading.set(true)`. Call `myDocs.upload(year, file)`.
    4. On success: build a new `MyDocumentsResponse` with the appended item (immutable update so signals refresh). If `selectedYear()` was `null` (empty state), set it to the new year. Show snackbar `Uploaded {filename}.`
    5. On error: see "Error handling" — open snackbar with the appropriate message.
    6. Finally: `uploading.set(false)` and `fileInput.nativeElement.value = ''` so re-selecting the same file fires `change` again.

- **`documents.component.html`**
  - In the controls row (added after the existing "Download All" button):
    ```html
    <button mat-stroked-button
            class="upload-btn"
            [disabled]="uploading() || selectedYear() == null"
            (click)="onUploadClick()">
      <mat-icon>upload</mat-icon>
      {{ uploading() ? 'Uploading…' : 'Upload' }}
    </button>
    <input type="file" hidden #fileInput (change)="onFileSelected($event)">
    ```
  - In each `.doc-row` (inside `.doc-info`, below `.doc-meta`):
    ```html
    @if (doc.uploadedByMe) {
      <mat-chip class="badge-you" disableRipple>Uploaded by you</mat-chip>
    }
    ```
    Firm-uploaded rows get no badge — the default is firm-uploaded, the badge calls out the exception.
  - The empty-state branch (`response()!.documents.length === 0` AND `linked === true`) gets an inline year `<select>` bound to `emptyStateYear` plus an Upload button using the same hidden file input.

- **`documents.component.css`**
  - `.badge-you` — small chip styling. Read the spacing/typography tokens from `docs/ui-design-guide.md`.

### Component imports added

`MatChipsModule` for the badge. No progress bar — the button label change to "Uploading…" is sufficient feedback for a single ≤10 MB file.

### No routing change

URL stays `/portal/documents`. No new route, no nav entry to add.

## Error handling

Server → snackbar mapping. All snackbars use a single OK action with default duration.

| HTTP status | Cause | Snackbar message |
|---|---|---|
| **201** | Success | `Uploaded {filename}.` (auto-dismiss ~3s, no action button) |
| **400** | `FileValidationException` — bad filename, blocked extension | Server's message verbatim (e.g. `Blocked file extension: .exe`) |
| **403** | `PortalNotLinkedException` | `Your portal isn't set up yet. Please contact GWH Accounting.` |
| **409** | `DocumentNameConflictException` | `A file named "{filename}" already exists for {year}. Please rename and try again.` |
| **413** | Spring multipart size limit | `File is too large. Maximum size is 10 MB.` |
| **other** | Network / 500 | `Upload failed. Please try again.` |

Frontend logic in the `error` branch of `myDocs.upload(...).subscribe`:
- Inspect `HttpErrorResponse.status`.
- For 400/409, prefer `error.error?.message` when present, else fall back to the table above.
- Always run a `finalize` block that clears `uploading` and resets the file input's `value`.

No retry button in the snackbar — the user just clicks **Upload** again.

## Security

- The endpoint is in the existing `/api/me/**` authenticated surface — the JWT-cookie auth flow already covers it. No new security config.
- A client can only attach a file to their own `client_id`, because the service resolves the client via `ClientRepository.findByUserId(authenticatedUser.id)` — there is no `clientId` parameter on the request.
- File contents are not executed or inspected beyond filename/extension/size. Blocked extensions and the configured max size are enforced both at the servlet multipart layer (413) and again in `FileUploadValidator` (defense in depth).
- The on-disk path is built from `clientId + year + filename`, where `filename` is rejected if it contains `/`, `\`, or `..`. Path traversal is prevented at validation time.
- `uploaded_by` is set from the resolved `User.id`, never from a request parameter, so a client cannot impersonate another uploader.

## Testing

### Backend — JUnit

- **`FileUploadValidatorTest`** (plain unit, no Spring context):
  - empty filename, oversize filename, path-traversal `..`, slash, blocked extension, oversize bytes → each throws `FileValidationException` with the expected message.
  - happy path returns silently.
- **`MeDocumentServiceTest`** (`@DataJpaTest` + `@AutoConfigureTestDatabase(replace = NONE)` + `@TestPropertySource` pointing at local Postgres per CLAUDE.md; `@TempDir` for the upload root via property override):
  - upload success → DB row inserted with `uploaded_by == user.id`; file written under `<tmp>/clients/<clientId>/<year>/<filename>`.
  - duplicate `(clientId, year, filename)` → throws `DocumentNameConflictException`; no second row, no file overwrite.
  - unlinked user → throws `PortalNotLinkedException`.
  - blocked extension → throws `FileValidationException`.
  - oversize → throws `FileValidationException`.
  - `listMyDocuments` sets `uploadedByMe` correctly with a mix of rows from this user and another user id.
- **`MeDocumentControllerTest`** (`@WebMvcTest(MeDocumentController.class)` with mocked `MeDocumentService` and security test slice):
  - 201 happy path returns the new `MyDocumentsDto.Item` (with `uploadedByMe: true`).
  - 409 path returns the conflict body with `filename` + `year`.
  - 403 path when service throws `PortalNotLinkedException`.
  - 413 path when the servlet multipart layer rejects an oversize upload (assert via a `MockMultipartFile` larger than the configured limit — verifies the exception handler maps `MultipartException`).

### Frontend — Vitest + Angular TestBed

- **`my-documents.service.spec.ts`**: `upload(2024, fileBlob)` POSTs `FormData` to `/api/me/documents?year=2024` and returns the response (use `HttpTestingController`).
- **`documents.component.spec.ts`**:
  - Clicking Upload triggers the hidden file input.
  - Selecting a file with year 2024 selected → service called with `2024` and the file.
  - On success, the returned item is appended; snackbar opens with `Uploaded {filename}.`
  - On 409, snackbar opens with the duplicate message; no item appended; button is re-enabled.
  - A row with `uploadedByMe: true` renders the `Uploaded by you` chip; `false` does not.
  - Empty-state path: when `documents.length === 0 && linked === true`, the empty-state year picker and Upload button are rendered; selecting a file uses `emptyStateYear`.

### E2E — Playwright

Per CLAUDE.md / schema, the final task group of a UI-touching change must include a committed Playwright test covering the affected flow.

`e2e/portal-documents-upload.spec.ts`:

- **Happy path:** log in as a seeded client → navigate to `/portal/documents` → click **Upload** → set the file chooser to a fixture PDF → assert the new row appears with the `Uploaded by you` chip → HEAD `/api/me/documents/zip?year={year}` returns 200 (confirms the file is included in the year ZIP).
- **Duplicate path:** re-upload the same filename → assert the snackbar shows the duplicate-name error and no second row appears.

## Rollout

Single PR. No feature flag — the endpoint is gated behind the existing auth and only affects a path that doesn't exist yet, so there is no "old vs new" behavior to toggle.

## Open questions

None outstanding. All UX decisions (location, year handling, multiplicity, duplicate handling, visibility/badge) were resolved during brainstorming.