# Capability Specs

One spec per capability. Each spec is the authoritative record of what the system must do for that capability.

## Capabilities

### `angular-material-theme` ✅ Implemented
**User Story**: The app uses a consistent Angular Material design system with colour tokens, typography, and spacing.

### `client-document-uploads` ✅ Implemented
**User Story**: Admins upload documents for clients; clients download them from their portal.

### `client-login-page` ✅ Implemented
**User Story**: Clients authenticate at `/login` via Google OAuth2 or email-code OTP, with all text rendered in the active language (EN/ZH).
**Backend**: JWT issued as httpOnly cookie after OAuth2 success; email-code OTP verification endpoint.
**Frontend**: `LoginComponent` at `/login`; `LoginEmailCodeComponent` multi-step OTP flow; all strings via `| translate`.

### `client-management` ✅ Implemented
**User Story**: Admins create and manage client records scoped to their ownership, with email uniqueness enforced and each client linked to a registered user account.
**Backend**: `clients.email` NOT NULL + UNIQUE; `clients.admin_id` NOT NULL FK to `users`; CRUD queries filtered by `admin_id`; `POST /api/clients` validates email against users table (400) and duplicate guard (409).
**Frontend**: Add Client dialog — email field triggers debounced lookup, auto-fills name on match, blocks submission for unregistered/duplicate email.
**Acceptance Criteria**: Admin can only see and create their own clients; duplicate emails and unregistered emails are rejected at submission time.

### `client-portal-ui` ✅ Implemented
**User Story**: Authenticated clients access a dashboard, documents, and messages through a guarded portal.

### `client-registration` ✅ Implemented
**User Story**: New clients register an account linked to their client record.

### `contact-page` ✅ Implemented
**User Story**: Visitors view office contact details and a map on the `/contact` page.

### `email-password-auth` ✅ Implemented
**User Story**: Clients authenticate with email and password (legacy; superseded by email-code OTP).

### `google-oauth2-auth` ✅ Implemented
**User Story**: Clients authenticate via Google OAuth2; a JWT cookie is issued on success.

### `landing-page-navbar` ✅ Implemented
**User Story**: All pages show a responsive navbar with links to public routes and the portal.

### `user-email-lookup` ✅ Implemented
**User Story**: Admins look up a registered user by email to validate they have an account before adding them as a client.
**Backend**: `GET /api/admin/users/lookup?email=` — returns `{ "name": "..." }` (200), 404 if not found, 403 if non-admin, 400 if param missing.
**Frontend**: Used internally by the Add Client dialog async validator.
**Acceptance Criteria**: Lookup returns the user's display name on match; unregistered emails receive 404.

### `user-language-preference` ✅ Implemented
**User Story**: Authenticated users' EN/ZH language choice persists in their profile so their locale is consistent across devices and sessions.
**Backend**: `users.language` VARCHAR(10) column (V11 migration); `PATCH /api/auth/me/language` saves preference; `GET /api/auth/me` returns `language` field.
**Frontend**: `TranslationService.applyProfileLanguage()` syncs profile↔localStorage on login; `setLanguage()` fires background PATCH when authenticated.
**Acceptance Criteria**: Language toggle while logged in persists across page reload and new devices.
