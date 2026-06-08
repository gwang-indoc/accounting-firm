---
Date: 2026-06-08
Change: add-client-email-lookup
Status: REVIEWED
---

## Goals

- Add `admin_id` to the `clients` table so each client record is owned by the admin who created it.
- Admins can only see, edit, and delete their own client records.
- When an admin enters an email in the Add Client dialog, check if that email belongs to a registered user; if not found, block submission.
- If the email is already recorded in the `clients` table (any admin), block submission as a duplicate.
- If a registered user match is found, auto-fill the name field with the user's name and show a hint below the email field; admin can override the name.
- Ensure `users.name` is always non-null: backfill existing nulls and enforce NOT NULL at the DB level.
- Ensure OAuth2 registration always populates `users.name` (fallback to email prefix if Google returns no name).

## Non-Goals

- Locking the name field — admin can always override the auto-filled name.
- Any lookup in the Edit Client dialog (add flow only).
- Exposing any user data beyond the display name.
- Transferring client ownership between admins.
- A super-admin view that shows all clients across all admins.

## Constraints

- `clients.admin_id` SHALL be NOT NULL; set to the authenticated admin's user ID on create.
- Migration SHALL delete all existing rows in `clients` before adding the `admin_id NOT NULL` column (clean slate).
- `clients.email` SHALL be globally UNIQUE (one client record per email across all admins).
- `clients.email` SHALL be NOT NULL (email is required for the registered-user lookup).
- Lookup endpoint must be admin-only (same auth guard as other `/api/admin/**` routes).
- No lookup triggered on invalid email format.
- Debounced — no per-keystroke backend calls.
- Lookup returns only `{ name: string }` — no other user fields.
- `users.name` SHALL be NOT NULL after this change; existing null rows backfilled before constraint is added.
- Fallback name for null Google `name` attribute: use the local part of the email (before `@`).

## Success Criteria

- Admin client list shows only clients where `admin_id` matches the authenticated admin.
- Admin cannot edit or delete a client owned by a different admin (backend returns 403).
- Typing a valid email that matches a user record auto-fills the name field, shows "Registered user: [name]" as a hint, and allows submission. Admin can edit the name freely.
- Typing a valid email with no match in `users` shows validation error "Email not registered" and blocks submission.
- Typing a valid email that already exists in `clients` shows validation error "Client already exists" and blocks submission.
- Typing an invalid email format shows no hint/error and makes no API call.
- Hint/error clears when email is cleared or changed; lookup re-runs on each valid change.
- Submit button is disabled while lookup is in progress (debounce period).
- After migration, no row in `users` has a null `name`.
- OAuth2 login with a Google account that provides no `name` attribute sets name to the email prefix (not null).
- All existing Add Client and Edit Client tests continue to pass (updated for new constraints).

## User Stories

**Admin adding a client:**
> As an admin, when I type an email in the Add Client form, I want to know if that email belongs to a registered user, have the name auto-filled, and be blocked from adding duplicates or unregistered emails.

**Admin viewing clients:**
> As an admin, I only want to see the clients I manage — not clients added by other admins.

## Open Questions

- None.

## Referenced Capabilities

- `admin-client-dialog.component.ts` — form where hint and validation appear
- `admin-clients.component.ts` — client list (needs admin_id filtering)
- `ClientController` / `ClientService` — backend CRUD (needs admin_id on all queries)
- `UserRepository.findByEmail()` — existing user lookup
- `ClientRepository.findByEmailIgnoreCaseOrderById()` — existing client email lookup
- Admin auth guard pattern — existing `/api/admin/**` security
- `OAuth2SuccessHandler.onAuthenticationSuccess()` — where name is set from Google attribute
