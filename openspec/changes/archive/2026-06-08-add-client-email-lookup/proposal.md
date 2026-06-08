---
Date: 2026-06-08
Change: add-client-email-lookup
Requirements: requirements.md
---

## Why

Admins need to add clients who are already registered users — but the current Add Client dialog has no link to the users table, allows duplicates, and has no ownership model. This change wires those three gaps together.

## What Changes

- **BREAKING** `clients` table: add `admin_id NOT NULL` FK to `users`; all existing rows deleted
- **BREAKING** `clients.email`: made NOT NULL and UNIQUE globally
- `clients` CRUD: all queries scoped to `admin_id = current authenticated admin`
- Add Client dialog: email field triggers debounced lookup against registered users; blocks submission if email unregistered or already a client; auto-fills name field on match
- `users.name`: made NOT NULL via migration (backfill nulls with email prefix); OAuth2 handler gains fallback for missing Google name attribute

## Capabilities

### New Capabilities

- `user-email-lookup` — admin endpoint `GET /api/admin/users/lookup?email=` returning `{ name }` if the email matches a registered user

### Modified Capabilities

- `client-management` — access control (admin_id ownership), duplicate email guard, clients.email NOT NULL + UNIQUE

## Impact

- `backend/src/main/resources/db/migration/` — new Flyway migration (clients schema + users.name NOT NULL)
- `backend/.../client/` — `Client` entity, `ClientRepository`, `ClientService`, `ClientController`, `CreateClientRequest`
- `backend/.../auth/` — `OAuth2SuccessHandler` (name fallback), new `UserLookupController`
- `frontend/.../admin/clients/` — `admin-client-dialog.component.ts`, `admin-clients.service.ts`

## Out of Scope

- Super-admin view across all admins' clients (deferred to `admin-super-view`)
- Transferring client ownership between admins (deferred to `admin-client-transfer`)
- Edit Client dialog email lookup (deferred to `edit-client-email-lookup`)
