## Context

The current `clients` table has no ownership model — any admin can see all clients, email is optional and non-unique, and there is no connection to the `users` table at creation time. This change adds admin ownership, enforces email integrity, gates the Add Client flow on registered-user lookup, and hardens the `users.name` column.

Current state:
- `clients`: no `admin_id`, email nullable + non-unique, no duplicate guard
- `users`: `name` nullable, OAuth handler sets null if Google returns no name
- Frontend Add Client dialog: no email validation beyond format

## Goals / Non-Goals

**Goals:**
- Add `admin_id` FK to clients; scope all CRUD to the owning admin
- Gate client creation on registered-user email lookup
- Block duplicate client emails globally
- Make `clients.email` NOT NULL + UNIQUE
- Make `users.name` NOT NULL; add OAuth fallback

**Non-Goals:**
- Client ownership transfer between admins
- Super-admin cross-admin view
- Edit Client dialog email lookup

## Decisions

### 1. Single Flyway migration for all schema changes

All DB changes (delete existing clients rows, add `admin_id`, make `clients.email` NOT NULL + UNIQUE, backfill `users.name`, make `users.name` NOT NULL) go in one new migration file (`V8__...`). Splitting across multiple migrations would create intermediate broken states.

_Alternative considered_: separate migrations per concern. Rejected — requires careful ordering and makes rollback harder with no benefit at this stage.

### 2. admin_id resolved from JWT, not request body

`admin_id` on `POST /api/clients` is set server-side from the authenticated user's ID extracted from the JWT cookie. It is never accepted from the request body — this prevents privilege escalation.

### 3. User email lookup is a separate admin-only endpoint

`GET /api/admin/users/lookup?email=` is a thin endpoint returning only `{ name }`. It does not reuse the existing client-management controller — user lookup is a distinct capability.

_Alternative considered_: embed the lookup into `POST /api/clients` and return a pre-flight response. Rejected — the frontend needs the lookup result before the user submits the form (auto-fill + validation UX).

### 4. Debounce + async validator in Angular

The email field uses an Angular async validator that debounces 400 ms, calls the lookup endpoint, and sets a custom error (`notRegistered` or `duplicateClient`) on the control. Two sequential checks:
1. `GET /api/admin/users/lookup?email=` → 404 → `notRegistered`
2. Check via the same endpoint response or a separate `GET /api/clients?email=` → conflict → `duplicateClient`

To avoid two round-trips, the backend lookup endpoint returns `404` for unregistered and `409`-semantics if the email is already a client — handled by a single combined endpoint or by sequential calls. Simplest: two sequential calls from the async validator (lookup, then a client-exists check).

_Alternative_: combine into one endpoint. Deferred — over-engineering for now; two calls is fine given debounce.

### 5. Client-exists check reuses existing ClientRepository

`ClientRepository.findByEmailIgnoreCaseOrderById()` already exists. The service layer uses it to check for duplicates before persisting.

### 6. users.name fallback: email local part

If `oauthUser.getAttribute("name")` returns null, `OAuth2SuccessHandler` uses `email.substring(0, email.indexOf('@'))` as the name. This is deterministic and never null (email is always present in Google OAuth).

## Risks / Trade-offs

- [Existing client data deleted] → Intentional clean slate; communicated in requirements. No rollback path for deleted rows.
- [Two async validator calls add latency] → Mitigated by 400 ms debounce; both calls are fast (indexed email lookups).
- [admin_id scoping means admins can't see each other's clients] → By design; documented as non-goal for super-admin view.
- [users.name NOT NULL migration could fail if any rows still null at migration time] → Backfill step runs before the NOT NULL constraint in the same migration; safe.

## Migration Plan

Single Flyway migration `V8__add_client_admin_ownership.sql`:

```sql
-- 1. Clean slate: delete all existing client rows
DELETE FROM clients;

-- 2. Add admin_id column
ALTER TABLE clients ADD COLUMN admin_id BIGINT NOT NULL REFERENCES users(id);

-- 3. Make clients.email NOT NULL and UNIQUE
ALTER TABLE clients ALTER COLUMN email SET NOT NULL;
ALTER TABLE clients ADD CONSTRAINT clients_email_unique UNIQUE (email);

-- 4. Backfill users.name nulls with email prefix
UPDATE users SET name = split_part(email, '@', 1) WHERE name IS NULL;

-- 5. Make users.name NOT NULL
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
```

Rollback: no automated rollback (deleted rows are gone). Roll forward only.

## Open Questions

- None.
