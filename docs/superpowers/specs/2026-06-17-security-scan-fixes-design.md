---
Date: 2026-06-17
Change: security-scan-fixes
Status: APPROVED
---

## Overview

Fix two open security findings from the 2026-06-17 security scan:
- HIGH: IDOR in `AdminMessageController` — all 4 endpoints lack client ownership verification
- MEDIUM: Missing HTTP security headers in `SecurityConfig`

## Architecture

### Ownership check pattern

Matches `DocumentController` exactly. `ClientService.findById(clientId, adminId)` throws `ClientAccessDeniedException` → `GlobalExceptionHandler` maps it to 403. No service changes needed.

```
Request → AdminMessageController
  → clientService.findById(clientId, resolveAdminId(auth))  ← NEW in all 4 methods
      throws ClientAccessDeniedException → 403
  → MessagingService (unchanged)
```

### Component changes

**`AdminMessageController`**
- Add `ClientService clientService` constructor injection
- `listThreads(clientId)` → add `Authentication auth` param, call `clientService.findById(clientId, resolveAdminId(auth))` before service delegation
- `getThread(clientId, threadId)` → same
- `createThread(clientId, req, auth)` → add `clientService.findById(clientId, resolveAdminId(auth))` before service delegation (already has auth param)
- `postReply(clientId, threadId, req, auth)` → same (already has auth param)

**`SecurityConfig`**
Add `.headers(...)` block to `filterChain`:
```java
.headers(h -> h
    .contentSecurityPolicy(csp -> csp.policyDirectives(
        "default-src 'self'; script-src 'self'; object-src 'none'"))
    .frameOptions(f -> f.deny())
    .contentTypeOptions(Customizer.withDefaults())
)
```

**`security_scan.md`**
Update HIGH and MEDIUM rows: `⚠️ Open` → `✅ Fixed`. Update summary table counts.

## Testing

**`AdminMessageControllerTest`**
- Add `@MockitoBean ClientService clientService`
- Existing `listThreads_returnsOk`, `listThreads_includesClientUnreadCountAndLastSenderType`, `getThread_returnsThread` tests: add `when(clientService.findById(7L, 42L)).thenReturn(someClientDto)` stub
- New test: `listThreads_whenAdminDoesNotOwnClient_returns403` — stub `clientService.findById(99L, 42L)` to throw `new ClientAccessDeniedException(99L)`, assert 403
- New test: `getThread_whenAdminDoesNotOwnClient_returns403` — same pattern for getThread

**`AdminMessageControllerSecurityTest`**
No changes needed — tests cover role-based access, not ownership.

**Security headers: no new tests needed** — `SecurityConfig` is wired into integration context; unit-testing Spring's built-in header writers adds no value.

## Error handling

`ClientAccessDeniedException` → `GlobalExceptionHandler.handleClientAccessDenied` → 403 (already in place, confirmed).

## Out of scope

- Changes to `MessagingService` signatures or logic
- Frontend changes
- New API endpoints
- `unreadCounts()` endpoint — takes no clientId, not IDOR-vulnerable
