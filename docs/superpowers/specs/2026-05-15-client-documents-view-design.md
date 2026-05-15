# Design — Client portal: view + download my documents by tax year

**Date:** 2026-05-15
**Status:** Approved (brainstorming) — ready for implementation planning

## Summary

When a client logs in, they should be able to view and download all the documents the firm has shared with them, filtered by tax year. The on-disk directory structure `uploads/clients/<clientId>/<year>/<filename>` already exists; the gap is the **user → client linkage**, the **client-facing API endpoints**, and the **frontend page**.

This change adds:

- A linkage step in the login flow (`UserClientLinkService.linkIfPossible`) that connects an authenticated user to a `clients` row by matching email.
- Two new client-self endpoints: `GET /api/me/documents` (list across all years) and `GET /api/me/documents/zip?year=YYYY` (download a year's docs as a zip).
- A new lazy-loaded Angular route `/portal/documents` showing a year selector, document list, per-row download, and a "Download All for {year}" button.
- Minor dashboard tweaks: real document count, real most-recent year, "Upload Document" placeholder replaced with a "View Documents" link.

## Goals

- Logged-in clients can see and download their own documents, organized by tax year, without firm-staff involvement.
- Linkage is automatic when a client's portal-account email matches a pre-created `clients.email` row.
- Multi-file download via a per-year zip — covers the common "give me everything for 2024" case.

## Non-goals

- Client-side uploads (view + download only).
- Admin/staff UI for managing clients or documents.
- Authorization hardening of the existing `/api/clients/{clientId}/documents` endpoint — this remains gap-locked but is left for a follow-up so the security boundary is tracked separately.
- Directory-layout changes: `uploads/clients/<id>/<year>/<filename>` is already the storage shape. `UPLOAD_DIR` env var still controls the configurable root prefix.

## User → Client linkage flow

A new `UserClientLinkService` encapsulates the linkage logic, called from both login paths after the `User` row is loaded/saved.

### Algorithm

```
linkIfPossible(User user):
  if any client.user_id == user.id  → return (already linked, no DB write)
  candidates = ClientRepository.findByEmailIgnoreCaseOrderById(user.email)
  candidates_unlinked = candidates.filter(c => c.user_id == null)
  switch candidates_unlinked.size:
    0 → return (no-op)
    1 → set candidates_unlinked[0].user_id = user.id; save
    2+ → log warning; link to candidates_unlinked[0] (lowest id); save
  if candidates.size > candidates_unlinked.size:
    log warning (some matching clients already linked to other users)
```

### Call sites

- `OAuth2SuccessHandler.onAuthenticationSuccess` — after `userRepository.save(user)` and before `jwtService.issueToken`.
- `AuthService.login` — after credential validation succeeds, before returning the User.

### Edge-case behavior

| Scenario | Behavior |
|---|---|
| User logs in, no matching email in `clients` | No-op. User stays unlinked. |
| User already linked | Short-circuit, no DB write. |
| Multiple unlinked `clients` share the email | Link to the lowest `client_id`, log warning. |
| Match exists but `user_id` already set to a different user | Refuse to overwrite, log warning. Treat as unlinked for this user (defensive — prevents takeover via email reuse). |
| Firm changes a client's email after link is established | Link persists (it's by id, not email). No re-linking on subsequent logins. |

## Backend

### New endpoint: `GET /api/me/documents`

Returns all documents for the client linked to the authenticated user, across all years.

Response (`MyDocumentsDto`):

```json
{
  "linked": true,
  "clientName": "Jane Smith",
  "documents": [
    {
      "id": 42,
      "year": 2025,
      "filename": "T4-2025.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 51234,
      "uploadedAt": "2026-02-14T10:23:00"
    },
    {
      "id": 41,
      "year": 2024,
      "filename": "Tax-Return-2024.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 200000,
      "uploadedAt": "2025-03-02T09:00:00"
    }
  ]
}
```

If the user has no linked client: returns `200` with `{ "linked": false, "clientName": null, "documents": [] }`. (200 not 404 — distinguishes "no portal access set up" from "endpoint broken" and lets the frontend render a friendly empty state without error handling.)

Documents are ordered by `year DESC, uploadedAt DESC`.

### New endpoint: `GET /api/me/documents/zip?year=YYYY`

Streams `application/zip` containing every document in `year` for the linked client.

- `Content-Disposition: attachment; filename="GWH-{year}-documents.zip"`
- Zip entries are prefixed with the year: e.g., `2025/T4-2025.pdf`. (Single-year zip means no collisions, but the prefix groups visually when extracted alongside other downloaded zips.)
- Filenames in entry names are UTF-8 encoded.
- Built with `java.util.zip.ZipOutputStream`, no temp file on disk.
- 404 if user has no linked client, or no docs exist for that year.
- Authorization: `client_id` is derived from the authenticated user — caller cannot specify it.

### New endpoint: `GET /api/me/documents/{docId}/download`

Streams a single file (like the existing per-client download). Authorization: the doc's `client_id` must equal the authenticated user's linked `client_id`; otherwise `404` (not `403` — don't leak that the doc exists).

### Files

| Action | Path |
|---|---|
| Create | `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/UserClientLinkService.java` |
| Create | `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/MeDocumentService.java` |
| Create | `backend/src/main/java/com/gwhaitech/accountingfirm/client/controller/MeDocumentController.java` |
| Create | `backend/src/main/java/com/gwhaitech/accountingfirm/client/dto/MyDocumentsDto.java` (response record + nested item record) |
| Modify | `backend/src/main/java/com/gwhaitech/accountingfirm/client/domain/ClientRepository.java` — add `findByEmailIgnoreCaseOrderById(String)` and `findByUserId(Long)` |
| Modify | `backend/src/main/java/com/gwhaitech/accountingfirm/auth/handler/OAuth2SuccessHandler.java` — inject and call `UserClientLinkService.linkIfPossible` |
| Modify | `backend/src/main/java/com/gwhaitech/accountingfirm/auth/service/AuthService.java` — same |
| Modify | `backend/src/main/java/com/gwhaitech/accountingfirm/client/controller/DocumentController.java` — add top-of-class `// TODO(auth): restrict to STAFF or owning user — tracked separately` comment |

The existing `/api/clients/{clientId}/documents` endpoints stay functional and unchanged for this scope. The known authorization gap there is tracked in code via the TODO comment.

### Security config

No `SecurityConfig` changes — the new `/api/me/**` routes inherit from the existing `/api/**` → authenticated rule.

### Migration

No DB migration required. The `clients.user_id` column exists from V5; this change just starts populating it.

## Frontend

### New route

```ts
{
  path: 'portal/documents',
  loadComponent: () =>
    import('./features/client-portal/documents/documents.component').then(m => m.DocumentsComponent),
  canActivate: [authGuard],
}
```

### New component

```
frontend/src/app/features/client-portal/documents/
├── documents.component.ts
├── documents.component.html
├── documents.component.css
└── documents.component.spec.ts
```

State (signals):

- `response = signal<MyDocumentsResponse | null>(null)` — populated by service call on init.
- `years = computed(() => unique years from response.documents, desc)`.
- `selectedYear = signal<number | null>(null)` — set to `years()[0]` after the response loads.
- `filteredDocs = computed(() => response()?.documents.filter(d => d.year === selectedYear()) ?? [])`.

Behavior:

- On init: `myDocumentsService.getAll().subscribe(...)` → set `response`, set `selectedYear` to most recent year.
- Per-row download: `<a [href]="'/api/me/documents/' + doc.id + '/download'" download>Download</a>` — direct browser link, JWT cookie sent automatically by `CredentialsInterceptor` (Angular's `download` attribute hints the browser to download rather than navigate).
- "Download All for {year}" button: `(click)="downloadYearZip()"` → `window.location.href = '/api/me/documents/zip?year=' + selectedYear()`. Button `[disabled]` when `filteredDocs().length === 0`.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  My Documents                                            │
│  Documents shared with you by GWH Accounting             │
│                                                          │
│  Tax Year: [ 2025 ▾ ]  · 3 documents   [ ⬇ Download All ]│
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 📄  T4-2025.pdf            uploaded Feb 14, 2026   │  │
│  │     PDF · 50 KB                       [ Download ] │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ 📄  Tax-Return-2025.pdf    uploaded Mar 2, 2026    │  │
│  │     PDF · 200 KB                      [ Download ] │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Empty states

- Response `linked: false` → "Your portal isn't set up yet. Please contact GWH Accounting to get started." Year selector and "Download All" hidden.
- `linked: true` but `documents: []` → "No documents have been shared with you yet. Your accountant will upload them here." Year selector and "Download All" hidden.
- `linked: true` but no docs in the selected year → "No documents for {year}. Try a different year above." Year selector visible; "Download All" disabled.

### New service

```ts
// frontend/src/app/core/services/my-documents.service.ts
@Injectable({ providedIn: 'root' })
export class MyDocumentsService {
  constructor(private http: HttpClient) {}
  getAll(): Observable<MyDocumentsResponse> {
    return this.http.get<MyDocumentsResponse>('/api/me/documents');
  }
}
```

Download paths are plain `<a href>` URLs — no service method needed.

### Dashboard tweaks

`features/client-portal/dashboard/dashboard.component.{ts,html}`:

- Fetch `/api/me/documents` on init via `MyDocumentsService.getAll()`.
- Replace the hardcoded `—` Documents stat with `response.documents.length`.
- Replace the hardcoded `2025` Tax Year stat with the most recent year from the response (or `—` if no docs).
- Replace the "Upload Document" Quick Actions button with a "View Documents" link button: `<a mat-button routerLink="/portal/documents">View Documents</a>`.

Both dashboard and documents page fetch independently — no shared service signal. Two `~1KB` HTTP calls when navigating between them is acceptable for this MVP.

### Proxy

`frontend/proxy.conf.json` already forwards `/api/**` to the backend — no change needed.

## Tests

### Backend

`UserClientLinkServiceTest` (`@DataJpaTest`):
- Links user to a single matching client by email
- Case-insensitive match (`Jane@X.com` → `jane@x.com`)
- Already-linked user: short-circuits, no DB write
- Zero matches: no-op
- Two unlinked clients share email: links to lowest `client_id`, logs warning
- One matching client already linked to a different user: refuses, logs warning

`MeDocumentControllerTest` (`@WebMvcTest` + mocked `MeDocumentService`):
- `GET /api/me/documents` → 200 + linked payload (user has client with docs)
- → 200 + `{linked: false, documents: []}` when user unlinked
- → 401 when unauthenticated
- `GET /api/me/documents/zip?year=2025` → 200 + `application/zip` + correct `Content-Disposition` when docs exist
- → 404 when year has no docs
- → 404 when user unlinked
- → 401 when unauthenticated
- `GET /api/me/documents/{docId}/download` → 200 when doc belongs to caller's client
- → 404 when doc belongs to a different client (no info leak)
- → 401 when unauthenticated

`MeDocumentServiceTest` (mocked repositories + `LocalStorageService`):
- `listMyDocuments(user)` returns docs ordered by `year DESC, uploadedAt DESC`
- `listMyDocuments(user)` returns `linked: false` payload when `ClientRepository.findByUserId(user.id)` is empty
- `zipForYear(user, year)` writes correct zip entries with `year/filename` prefix
- Each entry's bytes match what `LocalStorageService.resolve(filePath)` reads
- `zipForYear` throws `DocumentNotFoundException` when no docs match

`OAuth2SuccessHandlerTest` (update): Mockito-verify `userClientLinkService.linkIfPossible(user)` is invoked once after `userRepository.save`.

`AuthServiceTest` (update): same verification after credential check success path.

### Frontend (Vitest + TestBed)

`DocumentsComponent.spec.ts`:
- Renders "no portal access" empty state when API returns `linked: false`
- Renders "no documents yet" empty state when `linked: true` and `documents: []`
- Year dropdown shows unique years from response, sorted desc
- Default `selectedYear` is the most recent year
- Changing year filters the displayed list
- "Download All" button hidden when no docs at all; disabled when no docs in selected year; enabled otherwise
- Clicking "Download All" sets `window.location.href` to `/api/me/documents/zip?year={selectedYear}`
- Per-row Download anchor has correct `href`
- Initial fetch error opens an error snackbar

`MyDocumentsService.spec.ts`:
- `getAll()` issues `GET /api/me/documents` (verify via `HttpTestingController`)
- Typed response shape

`DashboardComponent.spec.ts` (update):
- Documents stat displays count from `MyDocumentsService` response (no longer `—`)
- Tax Year stat displays most recent year from response (no longer hardcoded `2025`)
- "View Documents" button has `routerLink="/portal/documents"`

### E2E (Playwright)

`e2e/client-documents.spec.ts` — 3 tests, using `page.route('**/api/me/documents', ...)` to mock the backend response (avoids requiring a seeded DB):

1. **Linked client with docs across two years**: mock response with docs in 2024 + 2025; navigate `/portal/documents` (with an authenticated session fixture); year dropdown defaults to 2025; switching to 2024 changes the list.
2. **Click "Download All for 2025"**: assert a navigation/download request fires for `/api/me/documents/zip?year=2025`.
3. **Unlinked user**: mock `/api/me/documents` → `{linked: false, documents: []}`; navigate `/portal/documents`; "Your portal isn't set up yet" text visible; no year dropdown; no "Download All" button.

E2E for backend zip-streaming integrity is out of scope — covered by `MeDocumentServiceTest`.

## Out of scope (deferred)

- Locking down `/api/clients/{clientId}/documents` for staff-only / owning-user access. (Tracked via in-code TODO comment in `DocumentController`.)
- Client uploads via the portal.
- Pagination on the documents list (response is unbounded — fine for typical volumes, would need rethinking past ~hundreds of docs per client).
- A "shared link" feature for sending docs to non-account-holders.
- A staff-side admin UI for creating clients and assigning their portal access.
- Audit logging of client downloads.
