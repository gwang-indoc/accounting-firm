# Security Scan Results

**Date:** 2026-06-17  
**Scope:** Full repo — backend (Spring Boot) + frontend (Angular)  
**Standard:** OWASP Top 10:2025, ASVS 5.0

---

## Summary

| Severity | Count | Status |
|---|---|---|
| Critical | 1 | ✅ Fixed |
| High | 1 | ✅ Fixed |
| Medium | 1 | ✅ Fixed |

---

## Findings

### [CRITICAL — FIXED] IDOR in DocumentController

**File:** `backend/src/main/java/com/gwhaitech/accountingfirm/client/controller/DocumentController.java`  
**OWASP:** A01 Broken Access Control

All 4 document endpoints lacked adminId ownership checks. Any authenticated admin could list, download, upload, or delete documents belonging to another admin's clients by manipulating `clientId` in the URL.

| Endpoint | Was missing |
|---|---|
| `POST /{clientId}/documents` | ownership check before upload |
| `GET /{clientId}/documents` | `Authentication` param + ownership check |
| `GET /{clientId}/documents/{docId}/download` | `Authentication` param + ownership check |
| `DELETE /{clientId}/documents/{docId}` | `Authentication` param + ownership check |

**Fix applied:** Injected `ClientService` into `DocumentController`. All 4 endpoints now extract `adminId` from `Authentication` and call `clientService.findById(clientId, adminId)` before any document operation. `ClientService.findById()` throws `ClientAccessDeniedException` → 403 if admin doesn't own the client.

---

### [HIGH — FIXED] IDOR in AdminMessageController

**File:** `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageController.java`  
**OWASP:** A01 Broken Access Control

`listThreads()` and `getThread()` accept `clientId` from the URL but never verify the authenticated admin owns that client. Any authenticated admin can read any client's message threads.

```java
// Line 23-25 — no auth param
@GetMapping("/{clientId}/threads")
public List<MessageThreadSummaryDto> listThreads(@PathVariable Long clientId) {
    return service.listAdminThreads(clientId);  // no ownership check
}
```

`createThread()` and `postReply()` in the same controller do extract `adminId` from auth — inconsistent.

**Fix:** Add `Authentication auth` to `listThreads()` and `getThread()`, extract adminId, call `clientService.findById(clientId, adminId)` before delegating to the service.

---

### [MEDIUM — FIXED] Missing HTTP security headers

**File:** `backend/src/main/java/com/gwhaitech/accountingfirm/config/SecurityConfig.java`  
**OWASP:** A02 Security Misconfiguration

No Content Security Policy, `X-Frame-Options`, or `X-Content-Type-Options` headers configured.

**Fix:** Add to `SecurityConfig.java`:

```java
http.headers(h -> h
    .contentSecurityPolicy(csp -> csp.policyDirectives(
        "default-src 'self'; script-src 'self'; object-src 'none'"))
    .frameOptions(f -> f.deny())
    .contentTypeOptions(Customizer.withDefaults())
);
```

---

## Confirmed Clean

| Area | Detail |
|---|---|
| JWT | HttpOnly, Secure, SameSite=Strict cookies; 32-byte minimum secret enforced |
| CSRF | Mitigated by SameSite=Strict + stateless sessions |
| SQL injection | Parameterized queries throughout; no string concatenation |
| File upload | Multi-layer validation: extension allowlist, declared MIME, Tika magic-byte detection, path traversal blocked |
| XSS | No `[innerHTML]` bindings; no `eval()`; no `bypassSecurityTrust*` |
| Secrets | All via env vars; none hardcoded in source or config files |
| ClientController IDOR | `adminId` checked in service via `ClientAccessDeniedException` |
| MeDocumentController IDOR | `userId` verified against document owner |
| AdminExportController | `validateOwnership()` called before export |
| Error responses | No stack traces exposed to users |
| Rate limiting | Email login code generation rate-limited (429) |
| Frontend auth guards | `AuthGuard` + `AdminGuard` cover all `/portal/**` and `/admin/**` routes |
| Token storage | No localStorage tokens; cookie-based auth only |
