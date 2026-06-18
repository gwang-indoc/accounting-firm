---
Date: 2026-06-17
Change: security-scan-fixes
Status: DRAFT
---

## Goals

- Close HIGH IDOR in `AdminMessageController`: all 4 endpoints must verify the authenticated admin owns the target client before delegating to the service
- Close MEDIUM missing HTTP security headers in `SecurityConfig`
- Update `security_scan.md` to mark both findings as Fixed

## Non-Goals

- Changes to `MessagingService` business logic (ownership check lives in the controller, delegating to `ClientService.findById` as done in `DocumentController`)
- Frontend changes
- New API endpoints

## Constraints

- Fix pattern must match `DocumentController`: inject `ClientService`, call `clientService.findById(clientId, adminId)` which throws `ClientAccessDeniedException` → 403 if admin doesn't own the client
- `resolveAdminId(auth)` helper already exists in the controller — reuse it for all 4 endpoints
- No changes to `MessagingService` signatures needed

## Success Criteria

- `listThreads`, `getThread`, `createThread`, `postReply` all call `clientService.findById(clientId, resolveAdminId(auth))` before any service delegation
- `SecurityConfig` has `.headers(...)` block with CSP, X-Frame-Options, X-Content-Type-Options
- `AdminMessageControllerTest`: `@MockitoBean ClientService`, mock for `findById(7L, 42L)` in existing list/get tests, new test asserting 403 on ownership violation (ClientAccessDeniedException)
- All backend tests pass: `cd backend && ./mvnw test`
- `security_scan.md` updated: both HIGH and MEDIUM rows show ✅ Fixed

## User Stories

1. As an admin, I cannot read message threads belonging to another admin's clients (listThreads, getThread blocked at controller)
2. As an admin, I cannot create threads or post replies to another admin's clients (createThread, postReply blocked at controller)
3. API responses include `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a strict CSP

## Open Questions

- None

## Referenced Capabilities

- `ClientService.findById(Long id, Long adminId)` — throws `ClientAccessDeniedException` on ownership mismatch
- `ClientAccessDeniedException` → mapped to 403 (verify exception handler covers this)
- `DocumentController` — reference implementation for this ownership pattern
