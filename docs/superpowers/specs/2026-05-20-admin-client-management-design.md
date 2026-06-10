# Admin Client Management — Design Spec

**Date:** 2026-05-20
**Status:** Approved

## Problem

Clients can self-register (email/password) or sign in via Google OAuth2, but portal access requires a `Client` row in the database with a matching email. Currently only a developer can create those rows (via raw `curl`). The firm needs an admin UI so staff can manage client records without touching the database.

## Approach: Option A — Admin Pre-creates Client Records

The accounting firm controls who gets portal access. Staff create a `Client` record with the client's email. When the client logs in (Google or email/password), `UserClientLinkService.linkIfPossible()` automatically links their `User` account to that record.

## Admin Role Assignment

Admin role is set manually in PostgreSQL — no in-app promotion flow:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@firm.com';
```

The `role` field already exists on the `User` entity (defaults to `"USER"`). After this one-time update, the JWT will carry `role=ADMIN` on next login.

## Backend Changes

### 1. SecurityConfig — protect `/api/clients/**`

Add a rule so only `ADMIN` users can reach client management endpoints:

```
.requestMatchers("/api/clients/**").hasRole("ADMIN")
```

This goes before the generic `.requestMatchers("/api/**").authenticated()` rule.

### 2. New endpoints on `ClientController`

| Method | Path | Purpose |
|--------|------|---------|
| `PUT` | `/api/clients/{id}` | Update name, email, phone |
| `DELETE` | `/api/clients/{id}` | Delete a client record |

Existing endpoints (`POST /api/clients`, `GET /api/clients`, `GET /api/clients/{id}`) stay as-is.

### 3. `UpdateClientRequest` DTO

```java
record UpdateClientRequest(
    @NotBlank String name,
    String email,
    String phone
) {}
```

### 4. `ClientService` — two new methods

- `updateClient(Long id, UpdateClientRequest)` — finds by id (404 if missing), updates fields, saves
- `deleteClient(Long id)` — finds by id (404 if missing), deletes

### 5. `ClientDto` — add `linkedUserId`

Add `Long linkedUserId` (mapped from `client.getUserId()`). The frontend uses this to show "Linked" vs "Not linked" badge. `ClientService.toDto()` must be updated to include this field — `Client.getUserId()` already exists (used by `UserClientLinkService`).

## Frontend Changes

### 1. `adminGuard`

New route guard at `src/app/core/guards/admin.guard.ts`. Checks `authService.currentUser()?.role === 'ADMIN'`. Redirects to `/` if not. Pattern mirrors the existing `authGuard`.

### 2. New route `/admin/clients`

Added to `app.routes.ts`, lazy-loaded, protected by both `authGuard` and `adminGuard`.

### 3. `AdminClientsComponent`

Location: `src/app/features/admin/clients/`

- Table listing all clients: Name, Email, Phone, Portal Link (Linked / Not linked badge), Actions (Edit / Delete)
- "Add Client" button opens a Material dialog (`AdminClientDialogComponent`)
- Edit row opens the same dialog pre-filled
- Delete row opens a `MatDialog` confirm prompt
- On success, list refreshes in-place (no full page reload)

### 4. `AdminClientDialogComponent`

Reusable dialog for both create and edit:
- Fields: Full Name (required), Email (required), Phone (optional)
- Calls `POST /api/clients` for create, `PUT /api/clients/{id}` for edit
- Email hint: "Must match the client's Google account email"

### 5. `AdminClientsService`

New HTTP service at `src/app/core/services/admin-clients.service.ts`:
- `getAll()` → `GET /api/clients`
- `create(req)` → `POST /api/clients`
- `update(id, req)` → `PUT /api/clients/{id}`
- `delete(id)` → `DELETE /api/clients/{id}`

### 6. Navbar — Admin link

The existing navbar shows an "Admin" link only when `currentUser()?.role === 'ADMIN'`. Clicking it navigates to `/admin/clients`.

## Data Flow

```
Admin logs in → JWT has role=ADMIN
→ navigates to /admin/clients (adminGuard passes)
→ sees client list (GET /api/clients — only accessible to ADMIN)
→ clicks "+ Add Client", fills form, submits
→ POST /api/clients creates Client row with email
→ Client later registers/logs in
→ UserClientLinkService.linkIfPossible() finds matching email → links
→ Client can access portal
```

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Non-admin visits `/admin/clients` | Redirected to `/` |
| Non-admin calls `GET /api/clients` | 403 from Spring Security |
| Create/update with duplicate email | Show server error message in dialog |
| Delete a linked client | Backend allows it; frontend warns in confirm dialog |

## Testing

- **Backend unit tests**: `ClientServiceTest` — update and delete happy paths, 404 on unknown id
- **Backend security test**: `ClientControllerSecurityTest` — verify `GET /api/clients` returns 403 for USER role, 200 for ADMIN role
- **Frontend unit tests**: `AdminClientsComponent` — renders list, opens dialog, calls service on submit
- **E2E**: `e2e/admin-clients.spec.ts` — admin logs in, creates a client, verifies it appears in the list
