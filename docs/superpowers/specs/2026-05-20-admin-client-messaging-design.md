# Admin ↔ Client Messaging — Design Spec

**Date:** 2026-05-20
**Status:** Approved

## Problem

The firm and its clients currently have no in-application channel for secure correspondence about a client's account. All communication happens out-of-band (personal email, phone). The firm wants a portal-based messaging feature so admin staff can send messages to a specific client, the client can read and reply from their portal, and either party can start new subject-tagged threads. The clients list page must also surface a per-client signal for unread client replies so admins know which conversations need attention.

## Scope

In scope:
- Two-way threaded messaging between an admin staff member and a client, both parties able to start new threads and reply within existing threads.
- Subject-tagged threads (email-style organisation; each thread has a fixed subject).
- Plain text message bodies. No attachments. No rich formatting.
- Short notification email to the recipient on every new message (no message body inside the email).
- Per-client unread-from-client count rendered as a badge on a new `Messages` row action in the existing admin clients list.
- Portal navigation entry point with an aggregate unread badge.

Out of scope (deferred):
- Multi-admin routing / assignment (single firm mailbox for v1).
- Attachments, rich text, message edit / delete.
- Email digests, unsubscribe link, HTML email.
- Pagination of threads or messages (return all for v1).
- Soft-delete or archive of threads.

## Approach

One coherent design covering the whole feature; implementation is phased into four independently mergeable phases (backend → admin frontend → portal frontend → email + E2E). Schema decisions are made up-front so they aren't re-litigated mid-feature.

## Data Model

Two new tables, introduced via Flyway migration `V8__create_message_threads_and_messages.sql`.

### `message_threads`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `BIGSERIAL PRIMARY KEY` | |
| `client_id` | `BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE` | Cascade matches `client_documents`. |
| `subject` | `VARCHAR(200) NOT NULL` | |
| `created_at` | `TIMESTAMP NOT NULL DEFAULT now()` | |
| `last_message_at` | `TIMESTAMP NOT NULL DEFAULT now()` | Updated on every new message. |
| `admin_unread_count` | `INT NOT NULL DEFAULT 0` | Incremented when client sends; zeroed when admin opens the thread. |
| `client_unread_count` | `INT NOT NULL DEFAULT 0` | Incremented when admin sends; zeroed when client opens the thread. |

Index: `(client_id, last_message_at DESC)` for thread-list queries.

### `messages`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `BIGSERIAL PRIMARY KEY` | |
| `thread_id` | `BIGINT NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE` | |
| `sender_type` | `VARCHAR(10) NOT NULL CHECK (sender_type IN ('ADMIN','CLIENT'))` | Discriminator. |
| `sender_user_id` | `BIGINT NOT NULL REFERENCES users(id)` | Who wrote it. |
| `body` | `TEXT NOT NULL` | Plain text. Server-side length cap 5000 chars. |
| `sent_at` | `TIMESTAMP NOT NULL DEFAULT now()` | |

Index: `(thread_id, sent_at)` for message-list queries.

### Schema rationale

- **Denormalised unread counts on the thread row.** The admin badge query is `SELECT client_id, SUM(admin_unread_count) FROM message_threads WHERE admin_unread_count > 0 GROUP BY client_id` — fast, no scan of `messages`. Alternative (per-user `last_read_message_id` pointer) requires id comparisons on every read.
- **`sender_type` discriminator string, not polymorphic FK.** Only two party shapes; `sender_user_id` always references `users.id`.
- **No per-message `read_at`.** With two parties and a single timeline, side-level counters are sufficient.

## Backend Endpoints

### Admin scope — `AdminMessageController`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/clients/{clientId}/threads` | List threads for this client, newest first, with last-message preview and `admin_unread_count`. |
| `POST` | `/api/clients/{clientId}/threads` | Create thread + first ADMIN message. Increments `client_unread_count` to 1. Returns thread DTO. |
| `GET` | `/api/clients/{clientId}/threads/{threadId}` | Full thread + all messages (ordered by `sent_at ASC`). Side effect: zeroes `admin_unread_count`. |
| `POST` | `/api/clients/{clientId}/threads/{threadId}/messages` | Post ADMIN reply. Increments `client_unread_count`. Updates `last_message_at`. |
| `GET` | `/api/clients/unread-counts` | `[{ clientId, unreadCount }]` — only rows where `unreadCount > 0`. Used by clients list page for row badges. |

### Portal scope — `PortalMessageController`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/portal/threads` | List my threads (resolved via authenticated user → linked client). |
| `POST` | `/api/portal/threads` | Client-initiated new thread + first CLIENT message. Increments `admin_unread_count` to 1. |
| `GET` | `/api/portal/threads/{threadId}` | Full thread + messages. Side effect: zeroes `client_unread_count`. |
| `POST` | `/api/portal/threads/{threadId}/messages` | Post CLIENT reply. Increments `admin_unread_count`. Updates `last_message_at`. |
| `GET` | `/api/portal/messages/unread-count` | `{ unreadCount }` for the portal nav badge. |

### Validation rules

- `subject`: required, trimmed, 1–200 chars.
- `body`: required, trimmed non-empty, max 5000 chars.
- Invalid payloads return `400` with field-level errors. Existing `@Valid`/`@NotBlank`/`@Size` annotations are used; no custom validator framework.

### Security

`SecurityConfig.java` matcher list grows by one block. Place these *before* the existing `/api/**` catchall:
```java
.requestMatchers("/api/clients/*/threads", "/api/clients/*/threads/**",
                 "/api/clients/unread-counts").hasRole("ADMIN")
.requestMatchers("/api/portal/**").authenticated()
```

Portal endpoints additionally enforce ownership in the service layer: thread's `client.userId` must equal the authenticated user's id. Foreign-thread access returns `403`. This protects against id-guessing. If the authenticated user has no linked client row at all (`users.id` not referenced by any `clients.user_id`), all portal endpoints return success but with empty payloads (`GET /api/portal/threads` → `[]`, `GET /api/portal/messages/unread-count` → `{ unreadCount: 0 }`), and the `POST` endpoints return `409 Conflict` with message `"No client record linked to your account."`. Linking is the admin's responsibility (existing `UserClientLinkService` flow).

### Transactional rules

- Posting a message and incrementing the opposite-side unread counter execute in one `@Transactional` method. No race window between insert and counter bump.
- Mark-as-read (the side effect on `GET .../threads/{threadId}`) is a single `UPDATE message_threads SET admin_unread_count = 0 WHERE id = ?` (or `client_unread_count`). Idempotent.
- Email notification fires *after* commit via `@TransactionalEventListener(phase = AFTER_COMMIT)`. A failed email never poisons the message; a rolled-back transaction never emits an email.

## UI Flows

### New routes

```
Admin (authGuard + adminGuard):
  /admin/clients/:id/messages              → AdminClientThreadsComponent
  /admin/clients/:id/messages/:threadId    → AdminClientThreadViewComponent

Portal (authGuard):
  /portal/messages                         → PortalInboxComponent
  /portal/messages/:threadId               → PortalThreadViewComponent
```

### Admin clients list — modification

The row gains a 4th action button: `[Edit] [Delete] [Documents] [Messages·N]`. The `·N` chip renders only when `admin_unread_count > 0` for that client. Click navigates to `/admin/clients/:id/messages`. The component loads `/api/clients/unread-counts` on init and merges into row data.

### Admin thread list page

- Back link to `/admin/clients`.
- Heading `Messages — {client.name}`.
- "+ New Thread" button opens `NewThreadDialogComponent` (Material dialog, same pattern as the existing Add Client dialog): subject input + body textarea + Send. On submit, `POST /api/clients/:id/threads`, close, navigate to the new thread view.
- Thread rows show subject, relative `last_message_at`, last-message body preview, and an unread chip when `admin_unread_count > 0`.
- Empty state: `No conversations yet. Click + New Thread to start one.`

### Admin thread view page

- Back link to thread list.
- Heading is the thread subject; subtitle `with {client.name}`.
- Messages rendered as bubbles: admin (current user) right-aligned with the sky-blue accent background, client left-aligned with the slate card colour. Each bubble shows sender label and timestamp.
- Inline `<textarea>` + Send button at the bottom (no dialog — keeps replies fast).
- Send disabled when textarea is empty / whitespace.
- On load, `GET .../threads/{threadId}` zeroes `admin_unread_count` server-side. The clients-list badge is therefore eventually consistent — admin reloads the clients list to see the cleared badge. (Acceptable for v1.)

### Portal inbox

Same shape as the admin thread list, minus the `with <client name>` (only one counter-party from the client's perspective). "+ New Message" opens a portal dialog → `POST /api/portal/threads`. Empty state: `You have no messages yet.`

### Portal thread view

Same layout as the admin thread view. Bubble alignment flipped: client (current user) right-aligned, admin left-aligned.

### Portal navigation

Portal navbar gains a `Messages` link between `Dashboard` and `Documents`. Renders an unread badge when `client_unread_count` summed across the client's threads is > 0. Source: `GET /api/portal/messages/unread-count` on portal app init and on visit to `/portal/messages`.

### Styling

Reuses the dark theme tokens already established in `admin-clients.component.css` and existing portal pages: `#0f172a` page background, `#1e293b` card surfaces, `#38bdf8` accent, `#334155` borders. Message bubbles use `border-radius: 12px`, `max-width: 70%`, vertical spacing between consecutive senders.

## Email Notification

A short notification email fires on every new-message event (new thread or reply).

### Trigger and recipients

| Event | Recipient |
|-------|-----------|
| Admin posts new thread | The client (`thread.client.email`) |
| Admin replies | The client |
| Client posts new thread | Firm admin mailbox (`MailProperties.notificationEmail`) |
| Client replies | Firm admin mailbox |

If `thread.client.email` is `NULL` for a client-recipient case, the email is skipped (logged at WARN). The in-portal message still posts successfully — email is a nudge, not a delivery guarantee.

### Template

Plain text only. Single template parameterised by sender label, subject, and link:

**Subject:**
```
New message in your accounting portal: <thread subject>
```

**Body:**
```
You have a new message from <sender label> in thread "<thread subject>".

View it here: https://<host>/portal/messages/<threadId>
  (or /admin/clients/<clientId>/messages/<threadId> for admins)

— Your accounting team
```

`<sender label>` is `your accountant` for admin → client and the client's name for client → admin. `<host>` comes from a new `app.publicBaseUrl` property (added to `application.yml` with localhost default). The signature line is hardcoded for v1 — no new firm-name config — to avoid expanding `MailProperties`.

The send link target depends on the recipient: portal route for client recipients, admin route for the firm mailbox.

### Wiring

- A new `MessagePostedEvent` is published from `MessagingService` after each insert. A `MessageNotificationListener` annotated `@TransactionalEventListener(phase = AFTER_COMMIT)` consumes it and calls `JavaMailSender.send(...)`.
- `JavaMailSender.send()` errors are caught and logged at ERROR. No retries. No queue.
- `LoggingMailSender` (already in use for dev) continues to log instead of sending — no special handling.

## Implementation Phases

Each phase ships as one or more PRs and ends with a passing baseline (`./mvnw test`, `npx ng test --no-watch`, and from Phase 4 onward `npx playwright test`).

### Phase 1 — Backend schema + services + endpoints

- Flyway migration `V8__create_message_threads_and_messages.sql`.
- Entities: `MessageThread`, `Message`. Repositories: `MessageThreadRepository`, `MessageRepository`.
- DTOs: `MessageThreadDto`, `MessageDto`, `NewThreadRequest`, `NewMessageRequest`, `ClientUnreadCountDto`.
- Service: `MessagingService` — `createThreadAsAdmin`, `createThreadAsClient`, `getThreadAsAdmin`, `getThreadAsClient`, `postAdminReply`, `postClientReply`, `listAdminThreads`, `listPortalThreads`, `getAdminUnreadCounts`, `getPortalUnreadCount`. Ownership check helper for portal calls.
- Controllers: `AdminMessageController`, `PortalMessageController`.
- `SecurityConfig` updated with new matchers.

### Phase 2 — Admin frontend

- `AdminClientsService` extended with `getUnreadCounts()`. `AdminClientsComponent` renders the `Messages·N` button + badge on each row.
- New `AdminClientMessagesService` (frontend) wrapping the admin thread endpoints.
- New components: `AdminClientThreadsComponent`, `AdminClientThreadViewComponent`, `NewThreadDialogComponent`.
- Routes added to `app.routes.ts`.

### Phase 3 — Portal frontend

- New `PortalMessagesService` wrapping the portal endpoints.
- New components: `PortalInboxComponent`, `PortalThreadViewComponent`, `NewPortalThreadDialogComponent`.
- Routes added.
- Portal navbar (existing component) extended with `Messages` link + unread badge.

### Phase 4 — Email notification + E2E

- `MessagePostedEvent`, `MessageNotificationListener`, plain-text template builder.
- `MessagingService` publishes the event after insert.
- Playwright spec `e2e/admin-client-messaging.spec.ts` exercising the admin↔client roundtrip.
- Dev log entry in `docs/log/YYYY-MM-DD.md`.

## Testing Strategy

### Backend (Phase 1)

- **Repository slices** (`@DataJpaTest` against local Postgres per the project's no-Testcontainers rule): `MessageThreadRepositoryTest`, `MessageRepositoryTest` — persistence, ordering, cascade delete.
- **Service unit tests**: `MessagingServiceTest` — new-thread creation in one transaction; reply bumps the opposite side; mark-as-read zeroes only the calling side; portal ownership check throws for foreign threads.
- **Controller security tests** (`@WebMvcTest` + mirrored `TestSecurityConfig` + source-pin, matching `DocumentControllerSecurityTest`): `AdminMessageControllerSecurityTest` (USER→403, admin→200), `PortalMessageControllerSecurityTest` (unauthenticated→401, foreign thread→403). Source-pin asserts `SecurityConfig.java` source contains `"/api/clients/*/threads/**"` and `"/api/portal/**"`.
- **Controller behavior tests** (`@WebMvcTest`): each endpoint happy path; validation errors (missing subject, empty body, body > 5000 chars) return `400`.

### Frontend (Phases 2 and 3)

Vitest + Angular TestBed, `vi.fn()` mocks, `provideZonelessChangeDetection()`. Existing test conventions from `admin-clients.component.spec.ts` followed.

Component coverage:
- `AdminClientsComponent` (extended): badge renders only when `unreadCount > 0`; clicking Messages navigates correctly; service spy merges counts into rows.
- `AdminClientThreadsComponent`: thread list rendering; empty state; row click navigates; "+ New Thread" opens dialog; dialog submission posts and navigates.
- `NewThreadDialogComponent`: subject/body validation; submit calls service; closes with new thread DTO.
- `AdminClientThreadViewComponent`: messages render in order with sender labels and timestamps; right/left alignment by sender; Send disabled when empty; Send appends and clears textarea.
- Portal counterparts mirror these tests with the alignment flipped.

### Email (Phase 4)

- `MessageNotificationListenerTest`: verifies template rendering for both directions; verifies recipient resolution; verifies skip-when-no-email path logs and does not throw.
- A small integration test asserts the listener does not fire when the surrounding transaction rolls back.

### E2E (Phase 4)

`e2e/admin-client-messaging.spec.ts` — full roundtrip:
1. Admin login (fake JWT cookie pattern already used in repo).
2. Open `/admin/clients` — verify no Messages badge initially.
3. Click Messages on a seeded client, "+ New Thread", fill subject + body, send.
4. Verify thread appears in list and the new thread view renders.
5. Switch to client session (linked user) and open `/portal/messages`.
6. Verify thread shows with unread badge; open it; reply.
7. Switch back to admin; reload clients list; verify `Messages·1` badge.
8. Open thread; verify reply visible; badge cleared after view.

### Baseline rule

Per the project's TDD discipline (`openspec/schemas/openspec-superpowers/schema.yaml` → `tasks.instruction`), each new task group starts with a baseline run. A failing baseline blocks the new group:
```
cd backend && ./mvnw test
cd frontend && npx ng test --no-watch
cd e2e && npx playwright test          # Phase 4 only — needs servers up
```

## Risks and Open Questions

- **Email reliability**: We log and drop failures rather than retry. Acceptable for v1 because the in-portal message still posts; revisit if SMTP becomes flaky.
- **Eventually-consistent badge**: After admin views a thread, the clients-list badge clears only on next page load. If users find this jarring, we can wire a signal-based refresh later — kept out of v1 to limit scope.
- **Single firm mailbox**: `MailProperties.notificationEmail` is the only recipient address for client-initiated messages. Multi-admin routing is deferred.
- **No pagination**: Threads and messages return in full. Likely acceptable for the firm's volume; revisit when a single thread exceeds ~100 messages or a client exceeds ~50 threads.
