---
Date: 2026-06-08
Change: add-client-email-lookup
Status: REVIEWED
---

## Goals

When an admin adds a new client, the email field must resolve to an existing registered user. On valid email entry, the system looks up the users table and either auto-fills the Full Name field (allowing save) or shows a blocking error.

## Non-Goals

- Email lookup on the **Edit Client** dialog (out of scope)
- Creating a new user account from the Add Client dialog
- Looking up by any field other than email
- Changing how existing client records display or behave

## Constraints

- Email must match a record in the `users` table — no user record, no client creation
- `UserRepository.findByEmail()` and `ClientRepository.findByUserId()` already exist; reuse them
- New backend endpoint must be admin-only (same security as other `/api/clients` endpoints)
- Zoneless Angular — no Zone.js; use signals/observables correctly
- No Testcontainers for backend tests; use `@DataJpaTest` + local PostgreSQL

## Success Criteria

1. Admin enters a valid email → system calls lookup endpoint
2. Email not found in users → inline error shown on email field, Save button disabled
3. Email found + user already linked to another client → inline error shown, Save button disabled
4. Email found + user not yet linked → Full Name field auto-filled with user's name, Save enabled
5. Admin can edit the auto-filled name before saving
6. Lookup triggers on blur and on debounced input (300ms) once email passes format validation
7. If email is cleared or changed to invalid/unfound, Full Name field is cleared and Save is disabled
8. All backend paths covered by unit/integration tests
9. E2E Playwright test covers the happy path (found + not linked → auto-fill → save)

## User Stories

**US-1 — Happy path**
Admin opens Add Client dialog, types a registered user's email. Full Name auto-fills with the user's name. Admin optionally edits the name and saves. New client is created and linked to that user.

**US-2 — Email not registered**
Admin types an email with no matching user record. Email field shows error: "No registered account found with this email." Save button is disabled.

**US-3 — User already has a client**
Admin types an email for a user already linked to another client. Email field shows error: "This user is already linked to an existing client." Save button is disabled.

**US-4 — Name override**
Admin accepts the auto-filled name or types a different name. Either value is accepted on save — the client's `name` column stores whatever the admin submitted.

## Open Questions

_(none — all resolved in exploration session 2026-06-08)_

## Referenced Capabilities

- `UserRepository.findByEmail(String email): Optional<User>` — `auth/domain/UserRepository.java`
- `ClientRepository.findByUserId(Long userId): Optional<Client>` — `client/domain/ClientRepository.java`
- `AdminClientDialogComponent` — `frontend/src/app/features/admin/clients/admin-client-dialog.component.ts`
- `AdminClientsService` — `frontend/src/app/core/services/admin-clients.service.ts`

## Proposed Backend Endpoint

```
GET /api/admin/users/lookup?email={email}

Response (200):
{
  "found": true,
  "name": "Jane Doe",
  "alreadyLinked": false,
  "linkedClientId": null
}

Response when not found (200):
{ "found": false }

Response when already linked (200):
{ "found": true, "name": "Jane Doe", "alreadyLinked": true, "linkedClientId": 42 }
```

Always returns 200 — the `found` flag drives frontend logic. 404 not used (absence of a user is not an error at the HTTP level).
