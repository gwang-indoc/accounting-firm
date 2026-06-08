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
**User Story**: Admins create and manage client records linked to portal accounts.

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

### `user-language-preference` ✅ Implemented
**User Story**: Authenticated users' EN/ZH language choice persists in their profile so their locale is consistent across devices and sessions.
**Backend**: `users.language` VARCHAR(10) column (V11 migration); `PATCH /api/auth/me/language` saves preference; `GET /api/auth/me` returns `language` field.
**Frontend**: `TranslationService.applyProfileLanguage()` syncs profile↔localStorage on login; `setLanguage()` fires background PATCH when authenticated.
**Acceptance Criteria**: Language toggle while logged in persists across page reload and new devices.
