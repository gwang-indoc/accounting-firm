---
Date: 2026-06-08
Change: add-client-email-lookup
Status: REVIEWED
---

## Goals

When an admin types an email in the Add Client (or Edit Client) dialog, automatically look up whether that email matches an existing user account. If a match is found, auto-fill the Name field with the user's name from the `users` table.

## Non-Goals

- No changes to how clients are saved or linked to users (that is already handled by `UserClientLinkService`).
- Do not block form submission if no user is found — the email lookup is informational/convenience only.
- Do not expose full user profile data; only `name` is returned by the lookup endpoint.

## Constraints

- Backend endpoint must be admin-only (existing `ROLE_ADMIN` security config).
- Lookup is read-only — no side effects.
- Email lookup is case-insensitive (consistent with `findByEmailIgnoreCaseOrderById` pattern already in use).
- Angular frontend is zoneless (`provideZonelessChangeDetection()`); use signals or `takeUntilDestroyed` for reactive patterns.

## Success Criteria

1. Typing a valid email in the Add Client dialog and pausing triggers a lookup.
2. If the email matches a user with a non-null name, the Name field is auto-filled with that name.
3. If the email matches no user, the Name field is left unchanged.
4. If the email field is cleared or changed to an invalid email, any previously auto-filled name is cleared from the Name field.
5. The lookup does not block or delay form submission.
6. No user-visible error if the lookup request fails (silent failure, no auto-fill).

## User Stories

**US-1 — Happy path (user found):**
Admin opens Add Client dialog, types `jane@example.com`. After a short debounce (~400ms), the backend is queried. `jane@example.com` exists in the `users` table with `name = "Jane Smith"`. The Name field is auto-filled with "Jane Smith". Admin can still edit the name manually.

**US-2 — No match:**
Admin types `unknown@example.com`. Lookup returns 404. Name field stays blank (or whatever was already typed). No error shown.

**US-3 — Invalid email (typing in progress):**
Admin types `jane@`. Email is invalid. No lookup is triggered. Name field untouched.

**US-4 — Edit Client dialog:**
Admin opens Edit Client for an existing client. They change the email to a different address that matches a different user. After debounce, the Name field is updated to the matched user's name.

**US-5 — Lookup failure (network error):**
Backend is unreachable. Lookup fails silently. No error shown to admin. Name field untouched.

**US-6 — Email cleared after auto-fill:**
Admin typed an email that auto-filled the name, then clears the email field. The auto-filled name is also cleared.

## Architecture

### Backend

New endpoint on `UserController` (or a slim `UserLookupController`):

```
GET /api/users/by-email?email={email}
→ 200 { name: "Jane Smith" }
→ 404 (no body) if not found
```

- Admin-secured (existing Spring Security config).
- Delegates to `UserRepository.findByEmailIgnoreCase(email)` (add this method; consistent with `findByEmailIgnoreCaseOrderById` on `ClientRepository`).
- Returns 200 `{ name }` only when user exists AND name is non-null. Returns 404 otherwise.
- Returns only `name` — no id, role, or other fields.

### Frontend

In `AdminClientDialogComponent`:

- Subscribe to `email` `valueChanges` with `debounceTime(400)` + `distinctUntilChanged`.
- When value is a syntactically valid email, call new `AdminUsersService.lookupByEmail(email): Observable<{name: string} | null>`.
- On success: `this.form.get('name')?.setValue(result.name)`.
- On 404 / error: no-op.
- Track whether the current name value was auto-filled (a `private autoFilledName` flag or signal) so clearing email also clears the name.

## Open Questions

- Should a subtle visual indicator (e.g. small ✓ badge, or hint text "Name filled from existing account") appear so the admin knows the name was auto-populated? Not requested; left as a follow-up if needed.
