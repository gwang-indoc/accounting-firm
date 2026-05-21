# Messaging & Auth V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin "awaiting client" status chips, wire the portal dashboard Messages card to live data, restructure the navbar, and make OAuth2 login redirect based on role.

**Architecture:** Four phases with green baselines between each. Phase 1 changes the shared DTO and adds role branching to the OAuth2 handler. Phases 2–3 consume the updated DTO in the UI. Phase 4 adds E2E coverage. The DTO record constructor signature changes in Phase 1, which breaks existing test call sites — those are fixed atomically in the same task.

**Tech Stack:** Java 21 / Spring Boot 3.5 / JUnit 5 / Mockito (backend); Angular 21 / Vitest / Angular TestBed (frontend); Playwright (E2E).

---

## File structure

**Modified — backend:**
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/MessageThreadSummaryDto.java` — add `clientUnreadCount`, `lastSenderType` fields
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/service/MessagingService.java` — update `toSummaryDto` signature and callers
- `backend/src/main/java/com/gwhaitech/accountingfirm/auth/handler/OAuth2SuccessHandler.java` — replace single `redirectUri` with `adminRedirectUri` + `userRedirectUri`; branch in `onAuthenticationSuccess`
- `backend/src/main/resources/application.yml` — replace `app.oauth2.redirect-uri` with `app.oauth2.redirect-uri.admin` + `.user`
- `docker-compose.yml` — replace `OAUTH2_REDIRECT_URI` with `OAUTH2_REDIRECT_URI_ADMIN` + `OAUTH2_REDIRECT_URI_USER`
- `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/service/MessagingServiceTest.java` — add new tests + fix DTO constructor call sites
- `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageControllerTest.java` — fix DTO constructor call sites + add new field assertions
- `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/PortalMessageControllerTest.java` — fix DTO constructor call sites + add new field assertions
- `backend/src/test/java/com/gwhaitech/accountingfirm/auth/handler/OAuth2SuccessHandlerTest.java` — add role-redirect tests + fix setUp constructor call

**Modified — frontend:**
- `frontend/src/app/core/models/message.model.ts` — add `clientUnreadCount`, `lastSenderType` to `MessageThreadSummaryDto`
- `frontend/src/app/features/admin/client-messages/admin-client-threads.component.ts` — add `threadStatus()` method
- `frontend/src/app/features/admin/client-messages/admin-client-threads.component.html` — replace `·unreadCount` chip with `@switch` block
- `frontend/src/app/features/admin/client-messages/admin-client-threads.component.css` — add `.chip-unread`, `.chip-awaiting`, `.chip-read` variants
- `frontend/src/app/features/admin/client-messages/admin-client-threads.component.spec.ts` — add chip-state tests, update sample data
- `frontend/src/app/features/client-portal/dashboard/dashboard.component.ts` — wire `PortalMessagesService.listThreads()`, add helpers
- `frontend/src/app/features/client-portal/dashboard/dashboard.component.html` — replace hardcoded loop with live data loop + "View all" footer
- `frontend/src/app/features/client-portal/dashboard/dashboard.component.spec.ts` — replace mock-data tests with service-backed tests
- `frontend/src/app/shared/navbar/navbar.component.html` — replace Messages + Admin blocks with Dashboard link; make brand an anchor
- `frontend/src/app/shared/navbar/navbar.component.ts` — add `brandLink` computed signal
- `frontend/src/app/shared/navbar/navbar.component.css` — anchor reset on `.brand`
- `frontend/src/app/shared/navbar/navbar.component.spec.ts` — update tests for removed links, add new assertions

**Created — E2E:**
- `e2e/messaging-auth-v2.spec.ts`

---

## Phase 1 — Backend

### Task 1: DTO fields + service update

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/MessageThreadSummaryDto.java`
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/service/MessagingService.java`
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/service/MessagingServiceTest.java`
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageControllerTest.java`
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/PortalMessageControllerTest.java`

- [ ] **Step 1: Run baseline — confirm all tests green**

```bash
cd backend && ./mvnw test
```
Expected: BUILD SUCCESS. If not, fix the baseline before continuing.

- [ ] **Step 2: Write the failing tests**

In `MessagingServiceTest.java`, add after the existing `listAdminThreads_returnsSummariesWithUnreadAndPreview` test:

```java
@Test
void listAdminThreads_includesClientUnreadCountAndLastSenderType() {
    MessageThread t = new MessageThread();
    t.setClientId(7L); t.setSubject("Tax");
    t.setLastMessageAt(java.time.LocalDateTime.now());
    t.setAdminUnreadCount(0); t.setClientUnreadCount(3);
    var spied = spy(t); when(spied.getId()).thenReturn(50L);
    when(threadRepo.findByClientIdOrderByLastMessageAtDesc(7L)).thenReturn(java.util.List.of(spied));

    Message m = new Message(); m.setBody("Hello"); m.setSenderType(SenderType.ADMIN);
    when(messageRepo.findByThreadIdOrderBySentAtAsc(50L)).thenReturn(java.util.List.of(m));

    var list = service.listAdminThreads(7L);

    assertThat(list.get(0).clientUnreadCount()).isEqualTo(3);
    assertThat(list.get(0).lastSenderType()).isEqualTo("ADMIN");
}

@Test
void listPortalThreads_setsClientUnreadCountToZeroAndIncludesLastSenderType() {
    Client client = new Client(); client.setId(7L); client.setUserId(99L);
    when(clientRepo.findByUserId(99L)).thenReturn(Optional.of(client));

    MessageThread t = new MessageThread();
    t.setClientId(7L); t.setSubject("Tax");
    t.setLastMessageAt(java.time.LocalDateTime.now());
    t.setClientUnreadCount(2);
    var spied = spy(t); when(spied.getId()).thenReturn(50L);
    when(threadRepo.findByClientIdOrderByLastMessageAtDesc(7L)).thenReturn(java.util.List.of(spied));

    Message m = new Message(); m.setBody("Hi"); m.setSenderType(SenderType.CLIENT);
    when(messageRepo.findByThreadIdOrderBySentAtAsc(50L)).thenReturn(java.util.List.of(m));

    var list = service.listPortalThreads(99L);

    assertThat(list.get(0).clientUnreadCount()).isEqualTo(0);
    assertThat(list.get(0).lastSenderType()).isEqualTo("CLIENT");
}
```

In `AdminMessageControllerTest.java`, add after the existing `listThreads_returnsOk` test:

```java
@Test
void listThreads_includesClientUnreadCountAndLastSenderType() throws Exception {
    var dto = new MessageThreadSummaryDto(50L, 7L, "Tax", LocalDateTime.now(), 2, 1, "ADMIN", "preview");
    when(service.listAdminThreads(7L)).thenReturn(List.of(dto));
    mvc.perform(get("/api/clients/7/threads").with(authentication(adminAuth())))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$[0].clientUnreadCount").value(1))
       .andExpect(jsonPath("$[0].lastSenderType").value("ADMIN"));
}
```

In `PortalMessageControllerTest.java`, find the `listThreads` test (around line 70) and add after it:

```java
@Test
void listThreads_portalHasClientUnreadCountZeroAndLastSenderType() throws Exception {
    var dto = new MessageThreadSummaryDto(50L, 7L, "Tax", LocalDateTime.now(), 1, 0, "CLIENT", "preview");
    when(service.listPortalThreads(anyLong())).thenReturn(
            List.of(dto));
    mvc.perform(get("/api/portal/threads").with(authentication(portalUser())))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$[0].clientUnreadCount").value(0))
       .andExpect(jsonPath("$[0].lastSenderType").value("CLIENT"));
}
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend && ./mvnw test 2>&1 | grep -E "COMPILATION ERROR|error:|cannot find symbol" | head -20
```
Expected: COMPILATION ERROR — `MessageThreadSummaryDto` constructor argument count mismatch and `clientUnreadCount()`/`lastSenderType()` method not found on the record.

- [ ] **Step 4: Update `MessageThreadSummaryDto`**

Replace the entire file `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/MessageThreadSummaryDto.java` with:

```java
package com.gwhaitech.accountingfirm.messaging.dto;

import java.time.LocalDateTime;

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

- [ ] **Step 5: Update `MessagingService.toSummaryDto` and its callers**

In `MessagingService.java`:

Replace the current `toSummaryDto` method (lines 183–189) with:

```java
private MessageThreadSummaryDto toSummaryDto(MessageThread t, int unread, int clientUnread) {
    var msgs = messageRepo.findByThreadIdOrderBySentAtAsc(t.getId());
    String preview = msgs.isEmpty() ? "" : msgs.get(msgs.size() - 1).getBody();
    if (preview != null && preview.length() > 80) preview = preview.substring(0, 77) + "...";
    String lastSenderType = msgs.isEmpty() ? null : msgs.get(msgs.size() - 1).getSenderType().name();
    return new MessageThreadSummaryDto(t.getId(), t.getClientId(), t.getSubject(),
            t.getLastMessageAt(), unread, clientUnread, lastSenderType, preview);
}
```

In `listAdminThreads` (line 155), update the lambda:

```java
.map(t -> toSummaryDto(t, t.getAdminUnreadCount(), t.getClientUnreadCount()))
```

In `listPortalThreads` (line 172), update the lambda:

```java
.map(t -> toSummaryDto(t, t.getClientUnreadCount(), 0))
```

- [ ] **Step 6: Fix broken DTO constructor call sites in existing tests**

In `AdminMessageControllerTest.java` line 73, update the existing `listThreads_returnsOk` test's DTO construction:

```java
var dto = new MessageThreadSummaryDto(50L, 7L, "Tax", LocalDateTime.now(), 2, 0, null, "preview");
```

In `PortalMessageControllerTest.java` line 72, update the existing `listThreads` test's DTO construction. Find the test that calls `when(service.listPortalThreads(...)).thenReturn(List.of(new MessageThreadSummaryDto(...)))` and change to:

```java
List.of(new MessageThreadSummaryDto(50L, 7L, "Tax", LocalDateTime.now(), 1, 0, "ADMIN", "preview")))
```

In `MessagingServiceTest.java`, the existing `listAdminThreads_returnsSummariesWithUnreadAndPreview` test does NOT construct the DTO directly (it calls the service and inspects the result) — no change needed there.

- [ ] **Step 7: Run tests and confirm GREEN**

```bash
cd backend && ./mvnw test
```
Expected: BUILD SUCCESS. The two new `MessagingServiceTest` tests pass with the correct field values. The two new controller tests pass. The existing tests still pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/MessageThreadSummaryDto.java \
        backend/src/main/java/com/gwhaitech/accountingfirm/messaging/service/MessagingService.java \
        backend/src/test/java/com/gwhaitech/accountingfirm/messaging/service/MessagingServiceTest.java \
        backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageControllerTest.java \
        backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/PortalMessageControllerTest.java
git commit -m "feat(messaging): add clientUnreadCount and lastSenderType to MessageThreadSummaryDto"
```

---

### Task 2: Role-aware OAuth2 redirect

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/auth/handler/OAuth2SuccessHandler.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `docker-compose.yml`
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/auth/handler/OAuth2SuccessHandlerTest.java`

- [ ] **Step 1: Write failing tests**

In `OAuth2SuccessHandlerTest.java`, add two new tests after the existing `returningUser_updatesAndSetsCookie` test. These tests construct the handler with the new two-URI constructor — which doesn't exist yet, so they'll fail to compile (RED):

```java
@Test
void adminUser_redirectsToAdminClients() throws Exception {
    OAuth2SuccessHandler adminHandler = new OAuth2SuccessHandler(
        mockUserRepo, mockJwtService, mockLinkService,
        false,
        "http://localhost:4200/admin/clients",
        "http://localhost:4200/portal/dashboard",
        86400000L
    );

    User adminUser = new User();
    adminUser.setId(1L); adminUser.setGoogleSub("google-sub-123");
    adminUser.setEmail("admin@firm.com"); adminUser.setName("Admin");
    adminUser.setRole("ADMIN");
    when(mockUserRepo.findByGoogleSub("google-sub-123")).thenReturn(Optional.empty());
    when(mockUserRepo.save(any(User.class))).thenReturn(adminUser);
    when(mockJwtService.issueToken(any(User.class))).thenReturn("jwt.token");

    adminHandler.onAuthenticationSuccess(mockRequest, mockResponse, buildAuth());

    verify(mockResponse).sendRedirect("http://localhost:4200/admin/clients");
}

@Test
void userRole_redirectsToPortalDashboard() throws Exception {
    OAuth2SuccessHandler userHandler = new OAuth2SuccessHandler(
        mockUserRepo, mockJwtService, mockLinkService,
        false,
        "http://localhost:4200/admin/clients",
        "http://localhost:4200/portal/dashboard",
        86400000L
    );

    User normalUser = new User();
    normalUser.setId(2L); normalUser.setGoogleSub("google-sub-123");
    normalUser.setEmail("test@example.com"); normalUser.setName("Test User");
    normalUser.setRole("USER");
    when(mockUserRepo.findByGoogleSub("google-sub-123")).thenReturn(Optional.empty());
    when(mockUserRepo.save(any(User.class))).thenReturn(normalUser);
    when(mockJwtService.issueToken(any(User.class))).thenReturn("jwt.token");

    userHandler.onAuthenticationSuccess(mockRequest, mockResponse, buildAuth());

    verify(mockResponse).sendRedirect("http://localhost:4200/portal/dashboard");
}
```

- [ ] **Step 2: Run tests to verify they fail (compile error)**

```bash
cd backend && ./mvnw test 2>&1 | grep -E "COMPILATION ERROR|error:|cannot find symbol" | head -10
```
Expected: COMPILATION ERROR — the 7-arg constructor doesn't exist on `OAuth2SuccessHandler`.

- [ ] **Step 3: Update `OAuth2SuccessHandler`**

Replace the entire file `backend/src/main/java/com/gwhaitech/accountingfirm/auth/handler/OAuth2SuccessHandler.java` with:

```java
package com.gwhaitech.accountingfirm.auth.handler;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.client.service.UserClientLinkService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final UserClientLinkService userClientLinkService;
    private final boolean cookieSecure;
    private final String adminRedirectUri;
    private final String userRedirectUri;
    private final long expirationMs;

    public OAuth2SuccessHandler(
            UserRepository userRepository,
            JwtService jwtService,
            UserClientLinkService userClientLinkService,
            @Value("${app.cookie.secure:true}") boolean cookieSecure,
            @Value("${app.oauth2.redirect-uri.admin:http://localhost:4200/admin/clients}") String adminRedirectUri,
            @Value("${app.oauth2.redirect-uri.user:http://localhost:4200/portal/dashboard}") String userRedirectUri,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.userClientLinkService = userClientLinkService;
        this.cookieSecure = cookieSecure;
        this.adminRedirectUri = adminRedirectUri;
        this.userRedirectUri = userRedirectUri;
        this.expirationMs = expirationMs;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oauthUser = oauthToken.getPrincipal();

        String googleSub = oauthUser.getAttribute("sub");
        String email = oauthUser.getAttribute("email");
        String name = oauthUser.getAttribute("name");

        User user = userRepository.findByGoogleSub(googleSub).orElseGet(User::new);
        user.setGoogleSub(googleSub);
        user.setEmail(email);
        user.setName(name);
        if (user.getRole() == null) {
            user.setRole("USER");
        }
        user = userRepository.save(user);
        userClientLinkService.linkIfPossible(user);

        String token = jwtService.issueToken(user);

        Cookie cookie = new Cookie("jwt", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setSecure(cookieSecure);
        cookie.setMaxAge((int) (expirationMs / 1000));
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);

        String target = "ADMIN".equals(user.getRole()) ? adminRedirectUri : userRedirectUri;
        response.sendRedirect(target);
    }
}
```

- [ ] **Step 4: Fix the existing `setUp()` in `OAuth2SuccessHandlerTest`**

The existing `setUp()` constructs the handler with the old 6-arg signature (line 57–64). Update it to use the new 7-arg constructor:

```java
@BeforeEach
void setUp() {
    mockUserRepo = mock(UserRepository.class);
    mockJwtService = mock(JwtService.class);
    mockLinkService = mock(UserClientLinkService.class);
    mockRequest = mock(HttpServletRequest.class);
    mockResponse = mock(HttpServletResponse.class);

    handler = new OAuth2SuccessHandler(
        mockUserRepo,
        mockJwtService,
        mockLinkService,
        false,
        "http://localhost:4200/admin/clients",
        "http://localhost:4200/portal/dashboard",
        86400000L
    );
}
```

Also update the existing `firstLogin_createsUserAndSetsCookie` test — it currently asserts `verify(mockResponse).sendRedirect("http://localhost:4200/portal/dashboard")`. The saved user in that test has role `"USER"`, so the assertion is still correct and needs no change.

- [ ] **Step 5: Update `application.yml`**

In `backend/src/main/resources/application.yml`, replace:

```yaml
  oauth2:
    redirect-uri: ${OAUTH2_REDIRECT_URI:http://localhost:4200/portal/dashboard}
```

with:

```yaml
  oauth2:
    redirect-uri:
      admin: ${OAUTH2_REDIRECT_URI_ADMIN:http://localhost:4200/admin/clients}
      user: ${OAUTH2_REDIRECT_URI_USER:http://localhost:4200/portal/dashboard}
```

- [ ] **Step 6: Update `docker-compose.yml`**

In `docker-compose.yml` (around line 36), replace:

```yaml
      OAUTH2_REDIRECT_URI: http://localhost:4200/portal/dashboard
```

with:

```yaml
      OAUTH2_REDIRECT_URI_ADMIN: http://localhost:4200/admin/clients
      OAUTH2_REDIRECT_URI_USER: http://localhost:4200/portal/dashboard
```

- [ ] **Step 7: Run tests and confirm GREEN**

```bash
cd backend && ./mvnw test
```
Expected: BUILD SUCCESS. The two new redirect tests pass. All existing tests still pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/gwhaitech/accountingfirm/auth/handler/OAuth2SuccessHandler.java \
        backend/src/main/resources/application.yml \
        docker-compose.yml \
        backend/src/test/java/com/gwhaitech/accountingfirm/auth/handler/OAuth2SuccessHandlerTest.java
git commit -m "feat(auth): role-aware OAuth2 redirect — ADMIN to /admin/clients, USER to /portal/dashboard"
```

- [ ] **Phase 1 code review**

```bash
git diff HEAD~2..HEAD
```

Run: `superpowers:requesting-code-review` with BASE_SHA = the commit before Task 1 and HEAD_SHA = current HEAD. Address CRITICAL/HIGH findings before moving to Phase 2.

- [ ] **Phase 1 dev log update**

Append an entry to `docs/log/2026-05-20.md` with commit hash, feature bullets (DTO fields added, role-aware redirect), review findings, test count, and TDD evidence (paste RED failure lines for each new test).

---

## Phase 2 — Admin frontend (awaiting-client chips)

### Task 3: Admin thread chip states

**Files:**
- Modify: `frontend/src/app/core/models/message.model.ts`
- Modify: `frontend/src/app/features/admin/client-messages/admin-client-threads.component.ts`
- Modify: `frontend/src/app/features/admin/client-messages/admin-client-threads.component.html`
- Modify: `frontend/src/app/features/admin/client-messages/admin-client-threads.component.css`
- Modify: `frontend/src/app/features/admin/client-messages/admin-client-threads.component.spec.ts`

- [ ] **Step 1: Run baseline**

```bash
cd frontend && npx ng test --no-watch
```
Expected: all tests pass.

- [ ] **Step 2: Write failing tests**

In `admin-client-threads.component.spec.ts`:

Update the `sampleThreads` constant to include the new fields and add diverse test cases. Replace `sampleThreads` (lines 18–21) with:

```typescript
const sampleThreads: MessageThreadSummaryDto[] = [
  { id: 50, clientId: 7, subject: 'Tax filing', lastMessageAt: '2026-05-19T12:00:00', unreadCount: 2, clientUnreadCount: 0, lastSenderType: 'CLIENT', lastMessagePreview: 'I will send the W-2…' },
  { id: 51, clientId: 7, subject: 'Q1 invoicing', lastMessageAt: '2026-05-15T09:00:00', unreadCount: 0, clientUnreadCount: 0, lastSenderType: 'ADMIN', lastMessagePreview: 'Thanks!' },
];
```

Explanation: thread 50 has `unreadCount: 2` → "unread" chip. Thread 51 has `lastSenderType: 'ADMIN'` and `clientUnreadCount: 0` → "read" chip.

Add four new test cases inside the `describe('AdminClientThreadsComponent', ...)` block, after the existing `shows unread chip only when unreadCount > 0` test:

```typescript
it('shows chip-unread when unreadCount > 0', async () => {
  const fx = await setup();
  const chip = fx.nativeElement.querySelector('[data-testid="thread-chip-unread"]');
  expect(chip).not.toBeNull();
  expect(chip!.textContent.trim()).toContain('2');
});

it('shows chip-read when lastSenderType is ADMIN and clientUnreadCount is 0', async () => {
  const awaiting: MessageThreadSummaryDto[] = [
    { id: 52, clientId: 7, subject: 'Invoice', lastMessageAt: '2026-05-18T10:00:00', unreadCount: 0, clientUnreadCount: 0, lastSenderType: 'ADMIN', lastMessagePreview: 'Please review' },
  ];
  const fx = await setup(awaiting);
  const chip = fx.nativeElement.querySelector('[data-testid="thread-chip-read"]');
  expect(chip).not.toBeNull();
  expect(chip!.textContent.trim()).toBe('Client read');
});

it('shows chip-awaiting when lastSenderType is ADMIN and clientUnreadCount > 0', async () => {
  const awaiting: MessageThreadSummaryDto[] = [
    { id: 53, clientId: 7, subject: 'Follow-up', lastMessageAt: '2026-05-17T09:00:00', unreadCount: 0, clientUnreadCount: 2, lastSenderType: 'ADMIN', lastMessagePreview: 'Any questions?' },
  ];
  const fx = await setup(awaiting);
  const chip = fx.nativeElement.querySelector('[data-testid="thread-chip-awaiting"]');
  expect(chip).not.toBeNull();
  expect(chip!.textContent.trim()).toBe('Awaiting client');
});

it('shows no chip when lastSenderType is CLIENT and unreadCount is 0', async () => {
  const balanced: MessageThreadSummaryDto[] = [
    { id: 54, clientId: 7, subject: 'Done', lastMessageAt: '2026-05-16T08:00:00', unreadCount: 0, clientUnreadCount: 0, lastSenderType: 'CLIENT', lastMessagePreview: 'Thank you' },
  ];
  const fx = await setup(balanced);
  expect(fx.nativeElement.querySelector('[data-testid="thread-chip-unread"]')).toBeNull();
  expect(fx.nativeElement.querySelector('[data-testid="thread-chip-awaiting"]')).toBeNull();
  expect(fx.nativeElement.querySelector('[data-testid="thread-chip-read"]')).toBeNull();
});
```

Also remove (or update) the old test `shows unread chip only when unreadCount > 0` — it relies on `data-testid="thread-unread-chip"` which we're replacing. Either delete it or rename the `data-testid` it queries to `thread-chip-unread` and update the assertion. The safest approach: replace the old test body with:

```typescript
it('old unread chip still renders via thread-chip-unread testid', async () => {
  const fx = await setup();
  const chip = fx.nativeElement.querySelector('[data-testid="thread-chip-unread"]');
  expect(chip).not.toBeNull();
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd frontend && npx ng test --no-watch --include='**/admin-client-threads.component.spec.ts'
```
Expected: 4 new tests FAIL because `threadStatus()` method and chip `data-testid` attributes don't exist yet. The TypeScript compile may also fail because `clientUnreadCount` and `lastSenderType` are not on the interface yet.

- [ ] **Step 4: Update the TypeScript model**

In `frontend/src/app/core/models/message.model.ts`, replace the `MessageThreadSummaryDto` interface:

```typescript
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

- [ ] **Step 5: Add `threadStatus()` method to the component**

In `admin-client-threads.component.ts`, add a method after `openNewThread()`:

```typescript
threadStatus(t: MessageThreadSummaryDto): 'unread' | 'awaiting' | 'read' | 'none' {
  if (t.unreadCount > 0) return 'unread';
  if (t.lastSenderType === 'ADMIN' && t.clientUnreadCount > 0) return 'awaiting';
  if (t.lastSenderType === 'ADMIN' && t.clientUnreadCount === 0) return 'read';
  return 'none';
}
```

Import `MessageThreadSummaryDto` is already present (line 10).

- [ ] **Step 6: Update the template**

In `admin-client-threads.component.html`, replace the chip block (lines 22–24):

```html
          @if (t.unreadCount > 0) {
            <span class="thread-chip" data-testid="thread-unread-chip">·{{ t.unreadCount }}</span>
          }
```

with:

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

- [ ] **Step 7: Update CSS**

In `admin-client-threads.component.css`, replace the existing `.thread-chip` rule:

```css
.thread-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
}

.chip-unread {
  background: #38bdf8;
  color: #0f172a;
}

.chip-awaiting {
  background: #f59e0b;
  color: #fff;
}

.chip-read {
  background: #9ca3af;
  color: #fff;
}
```

- [ ] **Step 8: Run tests and confirm GREEN**

```bash
cd frontend && npx ng test --no-watch
```
Expected: all tests pass. The four new chip-state tests pass, and existing tests still pass.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/core/models/message.model.ts \
        frontend/src/app/features/admin/client-messages/admin-client-threads.component.ts \
        frontend/src/app/features/admin/client-messages/admin-client-threads.component.html \
        frontend/src/app/features/admin/client-messages/admin-client-threads.component.css \
        frontend/src/app/features/admin/client-messages/admin-client-threads.component.spec.ts
git commit -m "feat(admin): add awaiting-client status chips to thread list"
```

- [ ] **Phase 2 code review**

Run: `superpowers:requesting-code-review` with BASE_SHA = Phase 1 end commit and HEAD_SHA = current HEAD. Address CRITICAL/HIGH findings before moving to Phase 3.

- [ ] **Phase 2 dev log update**

Append entry to `docs/log/2026-05-20.md`.

---

## Phase 3 — Portal frontend (dashboard + navbar)

### Task 4: Wire dashboard Messages card to live data

**Files:**
- Modify: `frontend/src/app/features/client-portal/dashboard/dashboard.component.ts`
- Modify: `frontend/src/app/features/client-portal/dashboard/dashboard.component.html`
- Modify: `frontend/src/app/features/client-portal/dashboard/dashboard.component.spec.ts`

- [ ] **Step 1: Run baseline**

```bash
cd frontend && npx ng test --no-watch
```
Expected: all tests pass.

- [ ] **Step 2: Write failing tests**

Replace the entire contents of `dashboard.component.spec.ts` with:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { PortalMessagesService } from '../../../core/services/portal-messages.service';
import { MessageThreadSummaryDto } from '../../../core/models/message.model';

const makeThread = (overrides: Partial<MessageThreadSummaryDto> = {}): MessageThreadSummaryDto => ({
  id: 1, clientId: 7, subject: 'Tax filing', lastMessageAt: '2026-05-19T12:00:00',
  unreadCount: 1, clientUnreadCount: 0, lastSenderType: 'ADMIN', lastMessagePreview: 'Hi',
  ...overrides,
});

async function setup(threads: MessageThreadSummaryDto[] = []) {
  const mockMessages = { listThreads: vi.fn().mockReturnValue(of(threads)) };
  await TestBed.configureTestingModule({
    imports: [DashboardComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: PortalMessagesService, useValue: mockMessages },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(DashboardComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  httpMock.match(() => true).forEach(r => r.flush({ linked: true, clientName: 'Jane', documents: [] }));
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, mockMessages };
}

describe('DashboardComponent', () => {
  it('renders mat-card wrapping welcome content', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.querySelector('mat-card')).not.toBeNull();
  });

  it('does not render a secondary mat-toolbar', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.querySelector('mat-toolbar')).toBeNull();
  });

  it('View Documents link points to /portal/documents', async () => {
    const { fixture } = await setup();
    const link = fixture.nativeElement.querySelector('[data-testid="view-documents-link"]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('routerLink')).toBe('/portal/documents');
  });

  it('calls PortalMessagesService.listThreads on init', async () => {
    const { mockMessages } = await setup([makeThread()]);
    expect(mockMessages.listThreads).toHaveBeenCalledOnce();
  });

  it('renders up to 3 thread rows', async () => {
    const threads = [makeThread({ id: 1 }), makeThread({ id: 2 }), makeThread({ id: 3 }), makeThread({ id: 4 })];
    const { fixture } = await setup(threads);
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="dashboard-thread-row"]');
    expect(rows.length).toBe(3);
  });

  it('shows empty state when no threads', async () => {
    const { fixture } = await setup([]);
    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[data-testid="dashboard-thread-row"]').length).toBe(0);
  });

  it('row has routerLink to /portal/messages/:threadId', async () => {
    const { fixture } = await setup([makeThread({ id: 42 })]);
    const row = fixture.nativeElement.querySelector('[data-testid="dashboard-thread-row"]');
    expect(row.getAttribute('ng-reflect-router-link')).toContain('42');
  });

  it('row shows "Your accountant" for ADMIN-sent threads', async () => {
    const { fixture } = await setup([makeThread({ lastSenderType: 'ADMIN' })]);
    expect(fixture.nativeElement.querySelector('.msg-sender').textContent.trim()).toBe('Your accountant');
  });

  it('row shows "You" for CLIENT-sent threads', async () => {
    const { fixture } = await setup([makeThread({ lastSenderType: 'CLIENT' })]);
    expect(fixture.nativeElement.querySelector('.msg-sender').textContent.trim()).toBe('You');
  });

  it('View all link is visible when threads exist', async () => {
    const { fixture } = await setup([makeThread()]);
    const link = fixture.nativeElement.querySelector('[data-testid="view-all-messages-link"]');
    expect(link).not.toBeNull();
  });

  it('View all link is hidden when no threads', async () => {
    const { fixture } = await setup([]);
    expect(fixture.nativeElement.querySelector('[data-testid="view-all-messages-link"]')).toBeNull();
  });

  it('unread row has class "unread"', async () => {
    const { fixture } = await setup([makeThread({ unreadCount: 1 })]);
    const row = fixture.nativeElement.querySelector('[data-testid="dashboard-thread-row"]');
    expect(row.classList.contains('unread')).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd frontend && npx ng test --no-watch --include='**/dashboard.component.spec.ts'
```
Expected: most new tests FAIL because the component still uses hardcoded data (no `PortalMessagesService` injection, no `threads` signal, no `dashboard-thread-row` testid).

- [ ] **Step 4: Update `dashboard.component.ts`**

Replace the entire file with:

```typescript
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MyDocumentsService } from '../../../core/services/my-documents.service';
import { PortalMessagesService } from '../../../core/services/portal-messages.service';
import { MyDocumentsResponse } from '../../../core/models/my-documents';
import { MessageThreadSummaryDto } from '../../../core/models/message.model';
import { MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatAnchor } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink, DatePipe,
    MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent,
    MatIcon, MatButton, MatAnchor, MatDivider,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  protected authService = inject(AuthService);
  private myDocs = inject(MyDocumentsService);
  private portalMessages = inject(PortalMessagesService);

  response = signal<MyDocumentsResponse | null>(null);
  threads = signal<MessageThreadSummaryDto[]>([]);

  documentCount = computed(() => this.response()?.documents.length ?? null);

  mostRecentYear = computed<number | null>(() => {
    const r = this.response();
    if (!r || r.documents.length === 0) return null;
    return r.documents.reduce((max, d) => Math.max(max, d.year), 0);
  });

  unreadCount = computed(() => this.threads().reduce((sum, t) => sum + t.unreadCount, 0));

  ngOnInit(): void {
    this.myDocs.getAll().subscribe({
      next: (res) => this.response.set(res),
      error: () => this.response.set(null),
    });
    this.portalMessages.listThreads().subscribe({
      next: (list) => this.threads.set(list.slice(0, 3)),
      error: () => this.threads.set([]),
    });
  }

  senderLabel(t: MessageThreadSummaryDto): string {
    return t.lastSenderType === 'ADMIN' ? 'Your accountant' : 'You';
  }

  titleFor(t: MessageThreadSummaryDto): string {
    return t.subject || t.lastMessagePreview;
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  get today(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
```

- [ ] **Step 5: Update `dashboard.component.html`**

Replace the Messages card section (lines 53–87) with:

```html
    <!-- Messages -->
    <mat-card class="card card-messages">
      <mat-card-header>
        <mat-card-title class="messages-heading">
          Messages
          @if (unreadCount() > 0) {
            <span class="unread-badge">{{ unreadCount() }}</span>
          }
        </mat-card-title>
      </mat-card-header>
      <mat-card-content class="messages-content">
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
        @if (threads().length > 0) {
          <a class="view-all-link"
             routerLink="/portal/messages"
             data-testid="view-all-messages-link">
            View all messages →
          </a>
        }
      </mat-card-content>
    </mat-card>
```

Add to `dashboard.component.css` (at the bottom of the file). The `.msg-row` rule already exists — add a separate anchor-reset block and the new link rule:

```css
/* anchor reset — .msg-row rows are now <a> elements */
a.msg-row {
  text-decoration: none;
  color: inherit;
}

.view-all-link {
  display: block;
  text-align: right;
  font-size: 13px;
  color: var(--mat-primary, #1976d2);
  text-decoration: none;
  padding: 8px 0 0;
}

.view-all-link:hover {
  text-decoration: underline;
}
```

- [ ] **Step 6: Run tests and confirm GREEN**

```bash
cd frontend && npx ng test --no-watch
```
Expected: all tests pass. The new dashboard tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/client-portal/dashboard/dashboard.component.ts \
        frontend/src/app/features/client-portal/dashboard/dashboard.component.html \
        frontend/src/app/features/client-portal/dashboard/dashboard.component.css \
        frontend/src/app/features/client-portal/dashboard/dashboard.component.spec.ts
git commit -m "feat(portal): wire dashboard Messages card to live data with View all footer"
```

---

### Task 5: Navbar restructure

**Files:**
- Modify: `frontend/src/app/shared/navbar/navbar.component.html`
- Modify: `frontend/src/app/shared/navbar/navbar.component.ts`
- Modify: `frontend/src/app/shared/navbar/navbar.component.css`
- Modify: `frontend/src/app/shared/navbar/navbar.component.spec.ts`

- [ ] **Step 1: Write failing tests**

In `navbar.component.spec.ts`, replace the entire `describe('Messages navigation', ...)` block (lines 185–253) with:

```typescript
describe('Navigation links', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;

  function setup(role: 'USER' | 'ADMIN' | null, unreadCount = 0) {
    const mockPortalMessagesService = {
      getUnreadCount: vi.fn().mockReturnValue(of({ unreadCount })),
    };
    TestBed.configureTestingModule({
      imports: [NavbarComponent, RouterModule.forRoot([])],
      providers: [
        provideHttpClient(),
        { provide: PortalMessagesService, useValue: mockPortalMessagesService },
      ],
    });
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService);
    if (role) {
      authService.currentUser.set({ id: 1, email: 'a@b.com', name: 'Alice', role });
    }
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('does not render messages-nav-link for USER', () => {
    setup('USER');
    expect(fixture.nativeElement.querySelector('[data-testid="messages-nav-link"]')).toBeNull();
  });

  it('does not render admin-nav-link for ADMIN', () => {
    setup('ADMIN');
    expect(fixture.nativeElement.querySelector('[data-testid="admin-nav-link"]')).toBeNull();
  });

  it('renders dashboard-nav-link for USER', () => {
    setup('USER');
    const link = fixture.nativeElement.querySelector('[data-testid="dashboard-nav-link"]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('routerLink')).toBe('/portal/dashboard');
  });

  it('does not render dashboard-nav-link for ADMIN', () => {
    setup('ADMIN');
    expect(fixture.nativeElement.querySelector('[data-testid="dashboard-nav-link"]')).toBeNull();
  });

  it('shows unread badge on dashboard link when unreadCount > 0', () => {
    setup('USER', 3);
    const badge = fixture.nativeElement.querySelector('[data-testid="messages-unread-badge"]');
    expect(badge).not.toBeNull();
    expect(badge.textContent.trim()).toBe('3');
  });

  it('hides unread badge when unreadCount is 0', () => {
    setup('USER', 0);
    expect(fixture.nativeElement.querySelector('[data-testid="messages-unread-badge"]')).toBeNull();
  });

  it('brand-link points to /admin/clients for ADMIN', () => {
    setup('ADMIN');
    const brand = fixture.nativeElement.querySelector('[data-testid="brand-link"]');
    expect(brand).not.toBeNull();
    expect(brand.getAttribute('ng-reflect-router-link')).toContain('admin/clients');
  });

  it('brand-link points to / for USER', () => {
    setup('USER');
    const brand = fixture.nativeElement.querySelector('[data-testid="brand-link"]');
    expect(brand.getAttribute('ng-reflect-router-link')).toBe('/');
  });

  it('brand-link points to / when unauthenticated', () => {
    setup(null);
    const brand = fixture.nativeElement.querySelector('[data-testid="brand-link"]');
    expect(brand.getAttribute('ng-reflect-router-link')).toBe('/');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx ng test --no-watch --include='**/navbar.component.spec.ts'
```
Expected: multiple new tests FAIL. `messages-nav-link` still exists (test expects it absent), `dashboard-nav-link` doesn't exist, `brand-link` testid doesn't exist on the anchor.

- [ ] **Step 3: Update `navbar.component.ts`**

Add the `brandLink` computed signal and import `computed`. Replace the file imports section and class with:

```typescript
import { Component, DestroyRef, inject, Input, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatSidenav } from '@angular/material/sidenav';
import { AuthService } from '../../core/services/auth.service';
import { PortalMessagesService } from '../../core/services/portal-messages.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatToolbar, MatButton, MatIconButton],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  @Input() sidenav!: MatSidenav;

  lang = signal<'en' | 'zh'>('en');
  sidenavOpen = signal(false);
  unreadCount = signal<number>(0);

  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly portalMessagesService = inject(PortalMessagesService);

  brandLink = computed(() =>
    this.authService.currentUser()?.role === 'ADMIN' ? '/admin/clients' : '/'
  );

  ngOnInit(): void {
    if (this.sidenav) {
      this.sidenav.openedChange
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(opened => this.sidenavOpen.set(opened));
    }
    if (this.authService.isAuthenticated()) {
      this.portalMessagesService.getUnreadCount()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(res => this.unreadCount.set(res.unreadCount));
    }
  }

  setLang(value: 'en' | 'zh'): void {
    this.lang.set(value);
  }

  toggleSidenav(): void {
    this.sidenav.toggle();
    this.sidenavOpen.update(v => !v);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/'])
    });
  }
}
```

- [ ] **Step 4: Update `navbar.component.html`**

Replace the entire file with:

```html
<mat-toolbar color="primary" class="navbar-toolbar">
  <a class="brand" [routerLink]="brandLink()" data-testid="brand-link">
    <div class="logo-icon">税</div>
    <div class="brand-text">
      <span class="company-name">GWH Accounting</span>
      <span class="tagline">Secure Tax & Accounting Portal</span>
    </div>
  </a>

  <div class="nav-links">
    <a mat-button href="#services">Services</a>
    <a mat-button href="#security">Security</a>
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
    } @else {
      <a mat-button routerLink="/login" data-testid="client-login-btn">Client Login</a>
    }
    <a mat-button routerLink="/contact">Contact</a>
    <a mat-flat-button routerLink="/book-consultation" class="cta-btn">Book Consultation</a>
  </div>

  <div class="lang-toggle">
    <button
      data-testid="lang-en"
      class="lang-pill"
      [class.active]="lang() === 'en'"
      (click)="setLang('en')"
    >EN</button>
    <button
      data-testid="lang-zh"
      class="lang-pill"
      [class.active]="lang() === 'zh'"
      (click)="setLang('zh')"
    >中文</button>
  </div>

  <button mat-icon-button class="hamburger" data-testid="hamburger" (click)="toggleSidenav()">{{ sidenavOpen() ? '✕' : '☰' }}</button>
</mat-toolbar>
```

- [ ] **Step 5: Update `navbar.component.css` for brand anchor**

The `.brand` rule already exists at line 14 with `display: flex; align-items: center; gap: 12px`. Add the anchor-reset properties to it:

```css
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
}
```

- [ ] **Step 6: Run tests and confirm GREEN**

```bash
cd frontend && npx ng test --no-watch
```
Expected: all tests pass. The new navigation tests pass; the old `messages-nav-link` tests in the replaced describe block are gone.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/shared/navbar/navbar.component.html \
        frontend/src/app/shared/navbar/navbar.component.ts \
        frontend/src/app/shared/navbar/navbar.component.css \
        frontend/src/app/shared/navbar/navbar.component.spec.ts
git commit -m "feat(navbar): replace Messages link with Dashboard badge; brand anchor routes by role"
```

- [ ] **Phase 3 code review**

Run: `superpowers:requesting-code-review` with BASE_SHA = Phase 2 end commit and HEAD_SHA = current HEAD. Address CRITICAL/HIGH findings before Phase 4.

- [ ] **Phase 3 dev log update**

Append entry to `docs/log/2026-05-20.md`.

---

## Phase 4 — E2E + verification

### Task 6: E2E coverage + final verification

**Files:**
- Create: `e2e/messaging-auth-v2.spec.ts`
- Modify: `docs/log/2026-05-20.md`

- [ ] **Step 1: Start both servers**

Backend:
```bash
./start.sh
```
Wait for "Started AccountingFirmApplication" in the log.

Frontend:
```bash
cd frontend && npm start
```
Wait for "Application bundle generation complete."

- [ ] **Step 2: Write the E2E spec**

Create `e2e/messaging-auth-v2.spec.ts`:

```typescript
import { test, expect, Page } from '@playwright/test';

const ADMIN_USER  = { id: 1, email: 'admin@firm.com', name: 'Admin', role: 'ADMIN' };
const CLIENT_USER = { id: 42, email: 'client@example.com', name: 'Test Client', role: 'USER' };

const SAMPLE_THREADS = [
  {
    id: 50, clientId: 7, subject: 'Tax filing', lastMessageAt: '2026-05-19T12:00:00',
    unreadCount: 0, clientUnreadCount: 2, lastSenderType: 'ADMIN', lastMessagePreview: 'Please review',
  },
  {
    id: 51, clientId: 7, subject: 'Q1 invoicing', lastMessageAt: '2026-05-15T09:00:00',
    unreadCount: 1, clientUnreadCount: 0, lastSenderType: 'CLIENT', lastMessagePreview: 'Got it',
  },
  {
    id: 52, clientId: 7, subject: 'Done', lastMessageAt: '2026-05-14T08:00:00',
    unreadCount: 0, clientUnreadCount: 0, lastSenderType: 'ADMIN', lastMessagePreview: 'Thanks',
  },
];

async function fakeAdminAuth(page: Page) {
  await page.context().addCookies([{ name: 'jwt', value: 'mock.jwt.token', domain: 'localhost', path: '/', httpOnly: true, secure: false }]);
  await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ADMIN_USER) }));
}

async function fakeClientAuth(page: Page) {
  await page.context().addCookies([{ name: 'jwt', value: 'mock.client.jwt.token', domain: 'localhost', path: '/', httpOnly: true, secure: false }]);
  await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CLIENT_USER) }));
  await page.route('**/api/portal/threads', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_THREADS) }));
  await page.route('**/api/portal/messages/unread-count', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ unreadCount: 1 }) }));
  await page.route('**/api/me/documents', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ linked: true, clientName: 'Test Client', documents: [] }) }));
}

test.describe('Admin thread chip states', () => {
  test('admin thread list shows chip-awaiting for admin-sent threads the client has not opened', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients/7/threads', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([SAMPLE_THREADS[0]]),
    }));
    await page.route('**/api/clients', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([{ id: 7, name: 'Test Client', email: 'client@example.com', phone: null, createdAt: '2026-01-01T00:00:00', linkedUserId: 42 }]),
    }));
    await page.goto('http://localhost:4200/admin/clients/7/messages');
    await expect(page.getByTestId('thread-chip-awaiting')).toBeVisible();
    await expect(page.getByTestId('thread-chip-awaiting')).toHaveText('Awaiting client');
  });

  test('admin thread list shows chip-unread when client replied', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients/7/threads', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([SAMPLE_THREADS[1]]),
    }));
    await page.route('**/api/clients', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([{ id: 7, name: 'Test Client', email: 'client@example.com', phone: null, createdAt: '2026-01-01T00:00:00', linkedUserId: 42 }]),
    }));
    await page.goto('http://localhost:4200/admin/clients/7/messages');
    await expect(page.getByTestId('thread-chip-unread')).toBeVisible();
  });

  test('admin thread list shows chip-read when client has read the last admin message', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients/7/threads', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([SAMPLE_THREADS[2]]),
    }));
    await page.route('**/api/clients', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([{ id: 7, name: 'Test Client', email: 'client@example.com', phone: null, createdAt: '2026-01-01T00:00:00', linkedUserId: 42 }]),
    }));
    await page.goto('http://localhost:4200/admin/clients/7/messages');
    await expect(page.getByTestId('thread-chip-read')).toBeVisible();
    await expect(page.getByTestId('thread-chip-read')).toHaveText('Client read');
  });
});

test.describe('Portal dashboard Messages card', () => {
  test('shows live threads on dashboard', async ({ page }) => {
    await fakeClientAuth(page);
    await page.goto('http://localhost:4200/portal/dashboard');
    const rows = page.getByTestId('dashboard-thread-row');
    await expect(rows).toHaveCount(3);
  });

  test('thread row shows "Your accountant" for ADMIN-sent thread', async ({ page }) => {
    await fakeClientAuth(page);
    await page.goto('http://localhost:4200/portal/dashboard');
    const firstRow = page.getByTestId('dashboard-thread-row').first();
    await expect(firstRow.locator('.msg-sender')).toHaveText('Your accountant');
  });

  test('"View all messages" link is visible when threads exist', async ({ page }) => {
    await fakeClientAuth(page);
    await page.goto('http://localhost:4200/portal/dashboard');
    await expect(page.getByTestId('view-all-messages-link')).toBeVisible();
  });
});

test.describe('Navbar restructure', () => {
  test('USER does not see Messages nav link', async ({ page }) => {
    await fakeClientAuth(page);
    await page.goto('http://localhost:4200/portal/dashboard');
    await expect(page.getByTestId('messages-nav-link')).not.toBeAttached();
  });

  test('USER sees Dashboard nav link with unread badge', async ({ page }) => {
    await fakeClientAuth(page);
    await page.goto('http://localhost:4200/portal/dashboard');
    await expect(page.getByTestId('dashboard-nav-link')).toBeVisible();
    await expect(page.getByTestId('messages-unread-badge')).toBeVisible();
  });

  test('ADMIN does not see Admin nav link', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.goto('http://localhost:4200/admin/clients');
    await expect(page.getByTestId('admin-nav-link')).not.toBeAttached();
  });
});
```

- [ ] **Step 3: Run the E2E spec**

```bash
cd e2e && npx playwright test messaging-auth-v2.spec.ts
```
Expected: all E2E tests pass.

- [ ] **Step 4: Run full test suite (final verification)**

Backend:
```bash
cd backend && ./mvnw test
```
Expected: BUILD SUCCESS.

Frontend:
```bash
cd frontend && npx ng test --no-watch
```
Expected: all tests pass.

Scan the full diff for stray debug output:
```bash
git diff main..HEAD | grep -E "console\.log|System\.out\.print|debugger" | head -20
```
Expected: no output (or only intentional logging).

- [ ] **Step 5: Run `superpowers:verification-before-completion`**

Execute the verification skill to confirm the implementation is complete and meets all spec requirements.

- [ ] **Step 6: Final commit**

```bash
git add e2e/messaging-auth-v2.spec.ts
git commit -m "test(e2e): add E2E coverage for v2 chips, dashboard card, and navbar"
```

- [ ] **Phase 4 code review**

Run: `superpowers:requesting-code-review` on the full v2 diff (BASE_SHA = last main commit, HEAD_SHA = current HEAD). Address CRITICAL/HIGH findings.

- [ ] **Phase 4 dev log entry**

Append final entry to `docs/log/2026-05-20.md` covering:
- All four phases completed
- Final test counts (backend + frontend)
- E2E spec committed at `e2e/messaging-auth-v2.spec.ts`
- Any review findings and how they were addressed

---

## Baseline commands (run before each phase)

- Backend: `cd backend && ./mvnw test`
- Frontend: `cd frontend && npx ng test --no-watch`
- E2E (requires live servers): `cd e2e && npx playwright test`
