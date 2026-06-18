# Security Scan Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two open findings from the 2026-06-17 security scan — IDOR in all four `AdminMessageController` endpoints (HIGH) and missing HTTP security headers in `SecurityConfig` (MEDIUM).

**Architecture:** All four `AdminMessageController` endpoints call `clientService.findById(clientId, adminId)` before service delegation; that method throws `ClientAccessDeniedException` (→ 403) if the admin doesn't own the client, matching the pattern used in `DocumentController`. Security headers are added to the existing `SecurityConfig.filterChain` via Spring's `.headers()` DSL.

**Tech Stack:** Java 21, Spring Boot 3.5, Spring Security, JUnit 5 + MockMvc, Mockito

---

## File Map

| File | Change |
|---|---|
| `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageController.java` | Add `ClientService` injection; add `Authentication auth` to `listThreads` + `getThread`; call `clientService.findById` in all 4 methods |
| `backend/src/main/java/com/gwhaitech/accountingfirm/config/SecurityConfig.java` | Add `.headers(...)` block |
| `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageControllerTest.java` | Add `@MockitoBean ClientService`; add 4 new 403 tests; add `findById` stubs to existing list/get/create/reply tests |
| `security_scan.md` | Mark HIGH and MEDIUM as ✅ Fixed |
| `docs/log/2026-06-17.md` | Add `security-scan-fixes` entry |

---

### Task 1: Write failing ownership-violation tests (Red)

**Files:**
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageControllerTest.java`

- [ ] **Step 1: Add imports and MockitoBean to `AdminMessageControllerTest`**

Open `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageControllerTest.java`.

Add these imports after the existing imports block:

```java
import com.gwhaitech.accountingfirm.client.exception.ClientAccessDeniedException;
import com.gwhaitech.accountingfirm.client.service.ClientService;

import static org.mockito.Mockito.doThrow;
```

Add this field alongside the other `@MockitoBean` fields (after `MessagingService service`):

```java
@MockitoBean
ClientService clientService;
```

- [ ] **Step 2: Add 4 failing 403 test methods**

Add these test methods to the class body (after the existing `unreadCounts_returnsOk` test):

```java
@Test
void listThreads_whenAdminDoesNotOwnClient_returns403() throws Exception {
    doThrow(new ClientAccessDeniedException(99L))
        .when(clientService).findById(99L, 42L);
    mvc.perform(get("/api/clients/99/threads").with(authentication(adminAuth())))
       .andExpect(status().isForbidden());
}

@Test
void getThread_whenAdminDoesNotOwnClient_returns403() throws Exception {
    doThrow(new ClientAccessDeniedException(99L))
        .when(clientService).findById(99L, 42L);
    mvc.perform(get("/api/clients/99/threads/50").with(authentication(adminAuth())))
       .andExpect(status().isForbidden());
}

@Test
void createThread_whenAdminDoesNotOwnClient_returns403() throws Exception {
    doThrow(new ClientAccessDeniedException(99L))
        .when(clientService).findById(99L, 42L);
    mvc.perform(post("/api/clients/99/threads")
            .with(authentication(adminAuth()))
            .contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(new NewThreadRequest("Tax", "Hi"))))
       .andExpect(status().isForbidden());
}

@Test
void postReply_whenAdminDoesNotOwnClient_returns403() throws Exception {
    doThrow(new ClientAccessDeniedException(99L))
        .when(clientService).findById(99L, 42L);
    mvc.perform(post("/api/clients/99/threads/50/messages")
            .with(authentication(adminAuth()))
            .contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(new NewMessageRequest("follow-up"))))
       .andExpect(status().isForbidden());
}
```

- [ ] **Step 3: Run the 4 new tests to confirm they fail (Red)**

```bash
cd backend && ./mvnw test -Dtest=AdminMessageControllerTest#listThreads_whenAdminDoesNotOwnClient_returns403+getThread_whenAdminDoesNotOwnClient_returns403+createThread_whenAdminDoesNotOwnClient_returns403+postReply_whenAdminDoesNotOwnClient_returns403 -pl . 2>&1 | tail -20
```

Expected: 4 FAILURES — tests expect 403, controller returns 200 (no ownership check yet).

---

### Task 2: Implement ownership checks in AdminMessageController (Green)

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageController.java`
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageControllerTest.java`

- [ ] **Step 1: Replace `AdminMessageController.java` with the ownership-checked version**

Replace the entire file content with:

```java
package com.gwhaitech.accountingfirm.messaging.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.service.ClientService;
import com.gwhaitech.accountingfirm.messaging.dto.*;
import com.gwhaitech.accountingfirm.messaging.service.MessagingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clients")
public class AdminMessageController {

    private final MessagingService service;
    private final ClientService clientService;

    public AdminMessageController(MessagingService service, ClientService clientService) {
        this.service = service;
        this.clientService = clientService;
    }

    @GetMapping("/{clientId}/threads")
    public List<MessageThreadSummaryDto> listThreads(@PathVariable Long clientId, Authentication auth) {
        clientService.findById(clientId, resolveAdminId(auth));
        return service.listAdminThreads(clientId);
    }

    @PostMapping("/{clientId}/threads")
    public ResponseEntity<MessageThreadDto> createThread(@PathVariable Long clientId,
                                                         @Valid @RequestBody NewThreadRequest req,
                                                         Authentication auth) {
        long adminId = resolveAdminId(auth);
        clientService.findById(clientId, adminId);
        return ResponseEntity.status(201).body(
            service.createThreadAsAdmin(clientId, req.subject(), req.body(), adminId));
    }

    @GetMapping("/{clientId}/threads/{threadId}")
    public MessageThreadDto getThread(@PathVariable Long clientId, @PathVariable Long threadId,
                                      Authentication auth) {
        clientService.findById(clientId, resolveAdminId(auth));
        return service.getThreadAsAdmin(clientId, threadId);
    }

    @PostMapping("/{clientId}/threads/{threadId}/messages")
    public ResponseEntity<MessageDto> postReply(@PathVariable Long clientId,
                                                @PathVariable Long threadId,
                                                @Valid @RequestBody NewMessageRequest req,
                                                Authentication auth) {
        long adminId = resolveAdminId(auth);
        clientService.findById(clientId, adminId);
        return ResponseEntity.status(201).body(
            service.postAdminReply(clientId, threadId, req.body(), adminId));
    }

    @GetMapping("/unread-counts")
    public List<ClientUnreadCountDto> unreadCounts() {
        return service.getAdminUnreadCounts();
    }

    private long resolveAdminId(Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof User u && u.getId() != null) return u.getId();
        throw new IllegalStateException("Authenticated user not resolvable");
    }
}
```

- [ ] **Step 2: Add `ClientDto` stubs to existing happy-path tests**

In `AdminMessageControllerTest`, add the following import:

```java
import com.gwhaitech.accountingfirm.client.dto.ClientDto;
```

In `AdminMessageControllerTest`, add a helper method alongside `adminAuth()`:

```java
private ClientDto clientDto(long id) {
    return new ClientDto(id, "ACME", "acme@example.com", null, null, null, 42L);
}
```

In `listThreads_returnsOk`, add before `mvc.perform(...)`:
```java
when(clientService.findById(7L, 42L)).thenReturn(clientDto(7L));
```

In `listThreads_includesClientUnreadCountAndLastSenderType`, add before `mvc.perform(...)`:
```java
when(clientService.findById(7L, 42L)).thenReturn(clientDto(7L));
```

In `getThread_returnsThread`, add before `mvc.perform(...)`:
```java
when(clientService.findById(7L, 42L)).thenReturn(clientDto(7L));
```

In `createThread_returns201`, add before `mvc.perform(...)`:
```java
when(clientService.findById(7L, 42L)).thenReturn(clientDto(7L));
```

In `postReply_returns201`, add before `mvc.perform(...)`:
```java
when(clientService.findById(7L, 42L)).thenReturn(clientDto(7L));
```

- [ ] **Step 3: Run all AdminMessageController tests**

```bash
cd backend && ./mvnw test -Dtest=AdminMessageControllerTest,AdminMessageControllerSecurityTest -pl . 2>&1 | tail -20
```

Expected: ALL PASS. The 4 new 403 tests pass; the existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageController.java \
        backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageControllerTest.java
git commit -m "fix(security): add client ownership check to all AdminMessageController endpoints

All four endpoints (listThreads, getThread, createThread, postReply) now call
clientService.findById(clientId, adminId) before delegating to MessagingService.
Throws ClientAccessDeniedException → 403 if admin doesn't own the client.
Closes HIGH IDOR finding from 2026-06-17 security scan."
```

---

### Task 3: Add HTTP security headers to SecurityConfig

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/config/SecurityConfig.java`

- [ ] **Step 1: Add `.headers(...)` block to `filterChain`**

In `SecurityConfig.java`, find the `http` chain that starts with `.csrf(csrf -> csrf.disable())`. Add `.headers(...)` immediately after `.cors(Customizer.withDefaults())`:

Replace:
```java
        http
            // CSRF protection is provided by SameSite=Strict on the JWT cookie (OAuth2SuccessHandler).
            // Stateless JWT auth with SameSite=Strict is the standard mitigation for CSRF without CSRF tokens.
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
```

With:
```java
        http
            // CSRF protection is provided by SameSite=Strict on the JWT cookie (OAuth2SuccessHandler).
            // Stateless JWT auth with SameSite=Strict is the standard mitigation for CSRF without CSRF tokens.
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .headers(h -> h
                .contentSecurityPolicy(csp -> csp.policyDirectives(
                    "default-src 'self'; script-src 'self'; object-src 'none'"))
                .frameOptions(f -> f.deny())
                .contentTypeOptions(Customizer.withDefaults())
            )
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
```

- [ ] **Step 2: Run full backend test suite**

```bash
cd backend && ./mvnw test 2>&1 | tail -20
```

Expected: ALL PASS (no changes to test files for this task).

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/gwhaitech/accountingfirm/config/SecurityConfig.java
git commit -m "fix(security): add CSP, X-Frame-Options, X-Content-Type-Options headers

Closes MEDIUM missing HTTP security headers finding from 2026-06-17 security scan."
```

---

### Task 4: Update security_scan.md

**Files:**
- Modify: `security_scan.md` (repo root)

- [ ] **Step 1: Update summary table and finding headers**

In `security_scan.md`:

Replace the summary table:
```markdown
| Severity | Count | Status |
|---|---|---|
| Critical | 1 | ✅ Fixed |
| High | 1 | ⚠️ Open |
| Medium | 1 | ⚠️ Open |
```

With:
```markdown
| Severity | Count | Status |
|---|---|---|
| Critical | 1 | ✅ Fixed |
| High | 1 | ✅ Fixed |
| Medium | 1 | ✅ Fixed |
```

Replace the HIGH finding header:
```markdown
### [HIGH — OPEN] IDOR in AdminMessageController
```

With:
```markdown
### [HIGH — FIXED] IDOR in AdminMessageController
```

Replace the MEDIUM finding header:
```markdown
### [MEDIUM — OPEN] Missing HTTP security headers
```

With:
```markdown
### [MEDIUM — FIXED] Missing HTTP security headers
```

- [ ] **Step 2: Commit**

```bash
git add security_scan.md
git commit -m "docs: mark HIGH and MEDIUM security findings as fixed"
```

---

### Task 5: Write dev log entry

**Files:**
- Modify: `docs/log/2026-06-17.md`

- [ ] **Step 1: Append entry to today's log**

Append to the end of `docs/log/2026-06-17.md`:

```markdown
---

## security-scan-fixes

**What shipped:** Closed two open findings from the 2026-06-17 security scan.

**Key changes:**
- `AdminMessageController` — all four endpoints (`listThreads`, `getThread`, `createThread`, `postReply`) now call `clientService.findById(clientId, adminId)` before delegating to `MessagingService`. Throws `ClientAccessDeniedException` → 403 if admin doesn't own the client. Matches `DocumentController` pattern.
- `SecurityConfig` — added `.headers(...)` block: CSP (`default-src 'self'; script-src 'self'; object-src 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.

**Decisions:**
- Fix applied at controller layer (not service layer) — matches existing `DocumentController` pattern; keeps `MessagingService` signatures unchanged.
- All 4 endpoints fixed (not just the 2 flagged) — `createThread` and `postReply` were also IDOR-vulnerable at the service level (scan missed them because they had `auth` params but no ownership check).

**Verification:** All backend tests pass. 4 new 403 tests added to `AdminMessageControllerTest`.

**Notes:**
- Spec/design/plan: `docs/superpowers/specs/2026-06-17-security-scan-fixes-requirements.md`, `docs/superpowers/specs/2026-06-17-security-scan-fixes-design.md`, `docs/superpowers/plans/2026-06-17-security-scan-fixes.md`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/log/2026-06-17.md
git commit -m "docs: add security-scan-fixes dev log entry"
```
