# Messaging & Auth V2 Design

**Date:** 2026-05-20
**Status:** Approved
**Predecessor:** `docs/superpowers/specs/2026-05-20-admin-client-messaging-design.md` (MVP, shipped)

## Goal

Polish three rough edges left from the messaging MVP and the OAuth2 flow:

1. **Admin "awaiting client" indicator** — surface a chip on each admin thread row showing whether the ball is in the client's court.
2. **Portal messaging UX redesign** — move messaging out of the global navbar and into the dashboard's Messages card, with the existing inbox page kept as overflow.
3. **Role-aware login + drop the navbar "Admin" button** — admins land on `/admin/clients`, USERs on `/portal/dashboard`, and the navbar no longer shows an "Admin" link.

## Non-goals

- Real-time updates (SSE/WebSocket) for unread counts.
- New messaging features (attachments, search, archive).
- Changing message schema or storage; both `admin_unread_count` and `client_unread_count` already exist on `message_threads`.

## Architecture

Three coordinated changes sharing two files:

- `MessageThreadSummaryDto` (backend) and its TypeScript mirror gain two fields.
- `NavbarComponent` (frontend) loses two links (Messages, Admin) and gains a Dashboard link with unread badge.
- `OAuth2SuccessHandler` branches the redirect target on `user.getRole()`.

The DTO change is the shared seam between Section 1 (admin chips) and Section 2 (portal "Your accountant" label).

---

## Section 1 — Admin awaiting-client indicator

### Backend

**`MessageThreadSummaryDto`** (`backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/MessageThreadSummaryDto.java`)

Add two fields:

```java
public record MessageThreadSummaryDto(
        Long id,
        Long clientId,
        String subject,
        LocalDateTime lastMessageAt,
        int unreadCount,
        int clientUnreadCount,
        String lastSenderType,
        String lastMessagePreview
) {}
```

- `unreadCount` keeps its existing semantics: **the viewer's** unread count (admin's on admin endpoints, client's on portal endpoints).
- `clientUnreadCount` is the client's unread count. On admin endpoints it carries the real value from `MessageThread.getClientUnreadCount()`. On portal endpoints it is set to `0` (the client doesn't need to see its own unread count duplicated).
- `lastSenderType` is the `senderType` of the most recent message in the thread (`"ADMIN"` or `"CLIENT"`). It is populated on both endpoints.

**`MessagingService.toSummaryDto`** (`backend/src/main/java/com/gwhaitech/accountingfirm/messaging/service/MessagingService.java`)

Currently:

```java
private MessageThreadSummaryDto toSummaryDto(MessageThread t, int unread) {
    var msgs = messageRepo.findByThreadIdOrderBySentAtAsc(t.getId());
    String preview = msgs.isEmpty() ? "" : msgs.get(msgs.size() - 1).getBody();
    if (preview != null && preview.length() > 80) preview = preview.substring(0, 77) + "...";
    return new MessageThreadSummaryDto(t.getId(), t.getClientId(), t.getSubject(),
            t.getLastMessageAt(), unread, preview);
}
```

Changes:

- Add a parameter `int clientUnread`. `listAdminThreads` passes `t.getClientUnreadCount()`; `listPortalThreads` passes `0`.
- Derive `lastSenderType` from the last message: `msgs.isEmpty() ? null : msgs.get(msgs.size() - 1).getSenderType().name()`. Persist as `String` in the DTO.
- All existing callers updated.

Note: the existing per-message read (`messageRepo.findByThreadIdOrderBySentAtAsc`) inside `toSummaryDto` is already an N+1 risk for long thread lists. **Not addressed in this spec** — fixing N+1 is out of scope and was already considered in the MVP code review. The new fields reuse the already-loaded `msgs` list, so no new queries are added.

### Frontend (admin)

**`MessageThreadSummaryDto`** (`frontend/src/app/core/models/message.model.ts`)

```ts
export interface MessageThreadSummaryDto {
  id: number;
  clientId: number;
  subject: string;
  lastMessageAt: string;
  unreadCount: number;
  clientUnreadCount: number;
  lastSenderType: SenderType | null;
  lastMessagePreview: string;
}
```

**Chip rules** (`admin-client-threads.component.html` / `.ts`):

Compute a single `threadStatus(t)` returning one of `'unread' | 'awaiting' | 'read' | 'none'`:

| Condition | Status |
|---|---|
| `t.unreadCount > 0` | `unread` |
| `t.lastSenderType === 'ADMIN' && t.clientUnreadCount > 0` | `awaiting` |
| `t.lastSenderType === 'ADMIN' && t.clientUnreadCount === 0` | `read` |
| otherwise | `none` |

Note: `unread` takes precedence — if the client has sent something new, that signal wins over any prior admin-sent status.

Template replaces the current `·{{ unreadCount }}` chip with:

```html
@switch (threadStatus(t)) {
  @case ('unread') {
    <span class="thread-chip chip-unread" data-testid="thread-chip-unread">·{{ t.unreadCount }}</span>
  }
  @case ('awaiting') {
    <span class="thread-chip chip-awaiting" data-testid="thread-chip-awaiting">Awaiting client</span>
  }
  @case ('read') {
    <span class="thread-chip chip-read" data-testid="thread-chip-read">Client read</span>
  }
}
```

CSS adds three chip variants. Reuse the existing `.thread-chip` shape; only colors change:

- `.chip-unread` → existing red/highlight (current behavior preserved).
- `.chip-awaiting` → amber (`#f59e0b` background, white text).
- `.chip-read` → grey (`#9ca3af` background, white text).

Exact tokens follow `docs/ui-design-guide.md` palette where applicable.

### Tests

- `MessagingServiceTest` — new cases covering each `lastSenderType` / `clientUnreadCount` permutation.
- `AdminMessageControllerTest` — assert the JSON response includes `clientUnreadCount` and `lastSenderType`.
- `PortalMessageControllerTest` — assert portal response has `clientUnreadCount === 0` and `lastSenderType` populated.
- `admin-client-threads.component.spec.ts` — four cases driving each chip state, asserting on `data-testid="thread-chip-*"`.

---

## Section 2 — Portal messaging UX redesign

### Dashboard card

**`dashboard.component.ts`** (`frontend/src/app/features/client-portal/dashboard/dashboard.component.ts`)

Remove:

- The `PortalMessage` interface (lines 11-17).
- The hardcoded `readonly messages: PortalMessage[] = [...]` (lines 55-59).
- The `get unreadCount(): number { ... }` getter (lines 51-53).

Add:

- Inject `PortalMessagesService`.
- `threads = signal<MessageThreadSummaryDto[]>([])` — populated in `ngOnInit` via `listThreads()`. Sliced to top 3 by `lastMessageAt` desc (already sorted by backend).
- `unreadCount = computed(() => this.threads().reduce((sum, t) => sum + t.unreadCount, 0))` — replaces the old getter.

Two derived helpers used by the template:

```ts
senderLabel(t: MessageThreadSummaryDto): string {
  return t.lastSenderType === 'ADMIN' ? 'Your accountant' : 'You';
}

titleFor(t: MessageThreadSummaryDto): string {
  return t.subject || t.lastMessagePreview;
}
```

**`dashboard.component.html`**

Replace the existing `@for (msg of messages; track msg.id)` loop with:

```html
@for (t of threads(); track t.id) {
  <a class="msg-row" [class.unread]="t.unreadCount > 0"
     [routerLink]="['/portal/messages', t.id]"
     data-testid="dashboard-thread-row">
    <span class="msg-dot"></span>
    <span class="msg-body">
      <span class="msg-title">{{ titleFor(t) }}</span>
      <span class="msg-sender">{{ senderLabel(t) }}</span>
    </span>
    <span class="msg-meta">
      <span class="msg-date">{{ t.lastMessageAt | date:'MMM d' }}</span>
      <mat-icon class="msg-chevron">chevron_right</mat-icon>
    </span>
  </a>
  @if (!$last) {
    <mat-divider></mat-divider>
  }
} @empty {
  <div class="empty-state">
    <mat-icon class="empty-icon">inbox</mat-icon>
    <p class="empty-title">No messages</p>
    <p class="empty-hint">Messages from your advisor will appear here</p>
  </div>
}
```

Note: the row becomes an `<a>` (anchor) instead of a `<button>`, since it navigates rather than triggers an action. Keep the existing `.msg-row` CSS — reset anchor styling as needed.

Card footer (inside `<mat-card-content>`, after the loop):

```html
@if (threads().length > 0) {
  <a class="view-all-link"
     routerLink="/portal/messages"
     data-testid="view-all-messages-link">
    View all messages →
  </a>
}
```

Style `.view-all-link` as a right-aligned text link in the brand color.

### Navbar

**`navbar.component.html`**

Delete the Messages block (current lines 16-22) and Admin block (lines 23-25). Replace with a single Dashboard link for non-admin users:

```html
@if (authService.isAuthenticated()) {
  <span class="nav-user-name">{{ authService.currentUser()?.name }}</span>
  @if (authService.currentUser()?.role !== 'ADMIN') {
    <a mat-button routerLink="/portal/dashboard" routerLinkActive="active" data-testid="dashboard-nav-link">
      Dashboard
      @if (unreadCount() > 0) {
        <span class="nav-badge" data-testid="messages-unread-badge">{{ unreadCount() }}</span>
      }
    </a>
  }
  <button mat-button data-testid="logout-btn" (click)="logout()">Logout</button>
}
```

The brand becomes a router link (see Section 3).

**`navbar.component.ts`**

No structural change — `unreadCount` signal and its `PortalMessagesService.getUnreadCount()` subscription stay exactly as today. The signal now drives the Dashboard badge instead of the Messages badge.

### Tests

- `dashboard.component.spec.ts` — replace the `readonly messages` assertions with:
  - Mocks `PortalMessagesService.listThreads()` returning 0, 1, 3, and 5 threads.
  - Asserts at most 3 rows render (top 3 case).
  - Asserts `senderLabel` returns "Your accountant" for ADMIN-sent threads.
  - Asserts "View all" link is visible iff `threads().length > 0`.
  - Asserts row `routerLink` is `['/portal/messages', t.id]`.
- `navbar.component.spec.ts`:
  - Drop the existing `messages-nav-link` and `messages-unread-badge` tests on the Messages link.
  - Add `dashboard-nav-link` visibility test for non-admin users.
  - Add `messages-unread-badge` test on the Dashboard link when `unreadCount() > 0`.
  - Assert that no element with `data-testid="messages-nav-link"` exists.

---

## Section 3 — Role-aware login + brand-logo + remove Admin button

### Backend

**`OAuth2SuccessHandler`** (`backend/src/main/java/com/gwhaitech/accountingfirm/auth/handler/OAuth2SuccessHandler.java`)

Replace the single `redirectUri` field with two role-specific fields:

```java
private final String adminRedirectUri;
private final String userRedirectUri;

public OAuth2SuccessHandler(
        UserRepository userRepository,
        JwtService jwtService,
        UserClientLinkService userClientLinkService,
        @Value("${app.cookie.secure:true}") boolean cookieSecure,
        @Value("${app.oauth2.redirect-uri.admin:http://localhost:4200/admin/clients}") String adminRedirectUri,
        @Value("${app.oauth2.redirect-uri.user:http://localhost:4200/portal/dashboard}") String userRedirectUri,
        @Value("${app.jwt.expiration-ms:86400000}") long expirationMs) {
    // ...
}
```

At the end of `onAuthenticationSuccess`, replace `response.sendRedirect(redirectUri)` with:

```java
String target = "ADMIN".equals(user.getRole()) ? adminRedirectUri : userRedirectUri;
response.sendRedirect(target);
```

**`application.yml`** — replace the existing `app.oauth2.redirect-uri` block with:

```yaml
oauth2:
  redirect-uri:
    admin: ${OAUTH2_REDIRECT_URI_ADMIN:http://localhost:4200/admin/clients}
    user: ${OAUTH2_REDIRECT_URI_USER:http://localhost:4200/portal/dashboard}
```

Update `.env.example` (if present) and `docker-compose.yml` env vars to match.

### Frontend

**Brand-logo** (`navbar.component.html`)

Replace the current `<div class="brand">` with a routerLink-bearing anchor:

```html
<a class="brand"
   [routerLink]="brandLink()"
   data-testid="brand-link">
  <div class="logo-icon">税</div>
  <div class="brand-text">
    <span class="company-name">GWH Accounting</span>
    <span class="tagline">Secure Tax & Accounting Portal</span>
  </div>
</a>
```

`navbar.component.ts` adds:

```ts
brandLink = computed(() =>
  this.authService.currentUser()?.role === 'ADMIN' ? '/admin/clients' : '/'
);
```

CSS: ensure the anchor inherits the existing `.brand` layout — add `text-decoration: none; color: inherit;` to the existing `.brand` rule.

### Tests

- `OAuth2SuccessHandlerTest` — new file (if not present) or extend existing. Two cases:
  - ADMIN user → response.sendRedirect called with `adminRedirectUri`.
  - USER role → called with `userRedirectUri`.
- `navbar.component.spec.ts`:
  - Assert `data-testid="admin-nav-link"` is no longer rendered for ADMIN users (it should not exist at all).
  - Assert `brand-link` `routerLink` is `/admin/clients` when ADMIN, `/` when USER, `/` when unauthenticated.
- E2E (`e2e/tests/admin-login.spec.ts` — new or extend existing admin spec):
  - Stub OAuth2 to return ADMIN, follow the redirect, assert URL ends with `/admin/clients`.
  - If the existing admin E2E flow already covers this, just extend its assertions.

---

## Data flow summary

```
Admin opens /admin/clients/{id}/messages
  → GET /api/clients/{clientId}/threads
  → MessagingService.listAdminThreads
  → toSummaryDto(t, t.getAdminUnreadCount(), t.getClientUnreadCount())
  → DTO { unreadCount, clientUnreadCount, lastSenderType, ... }
  → admin-client-threads renders chip via threadStatus()

Client opens /portal/dashboard
  → GET /api/portal/threads
  → MessagingService.listPortalThreads
  → toSummaryDto(t, t.getClientUnreadCount(), 0)
  → DTO { unreadCount, clientUnreadCount: 0, lastSenderType, ... }
  → dashboard takes top 3, renders rows with senderLabel()

User logs in via Google OAuth2
  → OAuth2SuccessHandler.onAuthenticationSuccess
  → user.getRole() == ADMIN ? adminRedirectUri : userRedirectUri
  → sendRedirect
```

## Error handling

- No new error paths. Backend changes are additive on the DTO; frontend just reads new fields. If `lastSenderType` is null (empty thread, theoretically impossible after MVP since threads are created with an initial message), the chip shows nothing — `threadStatus()` returns `'none'`.
- OAuth2 redirect failure is unchanged: Spring Security's existing failure handler covers it.

## Testing strategy

Each phase ends with a green baseline before the next starts.

- Backend: `cd backend && ./mvnw test`
- Frontend: `cd frontend && npx ng test --no-watch`
- E2E: `cd e2e && npx playwright test` (requires both servers running)

TDD is mandatory per `superpowers:test-driven-development`. Every new field, every chip rule, every redirect branch gets a failing test first.

## Phasing

The implementation plan will follow four phases mirroring the MVP plan:

1. **Backend** — DTO fields, `toSummaryDto` signature change, `OAuth2SuccessHandler` role branch, application.yml. Tests green.
2. **Admin frontend** — chip computation + CSS, admin-client-threads spec. Tests green.
3. **Portal frontend** — dashboard card wiring, navbar restructure (Messages link removed, Admin link removed, Dashboard link added with badge, brand anchored), specs updated. Tests green.
4. **E2E + dev log** — Playwright role-aware redirect spec, dashboard card thread spec, admin chip spec. Dev log entry written.

## Open questions

None. All previously-deferred questions resolved:

- DTO shape: side-specific `unreadCount` stays; `clientUnreadCount` added (admin-populated, portal-zero); `lastSenderType` added universally.
- Brand-logo: anchor with role-conditional `routerLink`.
- Chip semantics: Unread (red) / Awaiting client (amber) / Client read (grey) / none. Unread wins precedence.
- Dashboard nav link: new; replaces Messages link as the unread-badge host.
