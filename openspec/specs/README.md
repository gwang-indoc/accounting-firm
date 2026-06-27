# Capability Specs

One spec per capability. Each spec is the authoritative record of what the system must do for that capability.

## Capabilities

### `admin-client-export` ✅ Implemented
**User Story**: Admins select up to 200 clients and download their metadata as CSV, their documents as ZIP, or both in a combined ZIP — with server-enforced ownership validation.
**Backend**: `POST /api/clients/export` (metadata/documents/both, streamed via `ZipOutputStream`); `GET /api/clients/ids` (lightweight IDs-only endpoint for select-all). `AdminExportService` validates ownership (403) and enforces 200-client hard cap (400). CSV via `PrintWriter` with RFC 4180 quoting; ZIP entries at `{ClientName}-{clientId}/{year}/{filename}`.
**Frontend**: Checkbox column in admin client list; "Select all" button in `<th class="select-col">` (above checkboxes) fetches `GET /api/clients/ids`; `effect()` clears selection on filter change; Export button in page header (always visible, disabled when selection empty); export toolbar shows count badge + "Clear" deselect-all only; `AdminExportDialogComponent` (metadata/documents checkboxes + year selector); `AdminExportService` blob POST → Content-Disposition filename → `URL.createObjectURL` anchor download.
**Acceptance Criteria**: Admin can export 1–200 own clients; server rejects non-owned clients with 403; export limited to 200 per request; browser downloads file with server-provided filename; errors surface in snackbar.

### `angular-material-theme` ✅ Implemented
**User Story**: The app uses a consistent Angular Material design system with colour tokens, typography, and spacing.

### `client-document-uploads` ✅ Implemented
**User Story**: Admins upload documents for clients; clients upload and download their own from the portal.
**Backend**: `POST /api/clients/{id}/documents?year=` (admin); `POST /api/portal/documents?year=` (client). Three-layer validation in `FileUploadValidator`: (1) extension allowlist (`ALLOWED_EXTENSIONS` env var, default pdf/jpg/png/xlsx/xls/csv/doc/docx), (2) declared `Content-Type` vs extension map, (3) Tika content inspection (magic bytes + OOXMLDetector). `tika-core` + `tika-parser-microsoft-module` detect renamed executables and plain ZIPs masquerading as OOXML.
**Frontend**: Upload button triggers file picker; 400 error message shown inline.
**Acceptance Criteria**: Renamed `evil.exe` presented as `evil.pdf` is rejected; plain `.zip` presented as `.xlsx` is rejected; legitimate files of all allowed types upload successfully.

### `client-login-page` ✅ Implemented
**User Story**: Clients authenticate at `/login` via Google OAuth2 or email-code OTP, with all text rendered in the active language (EN/ZH).
**Backend**: JWT issued as httpOnly cookie after OAuth2 success; email-code OTP verification endpoint.
**Frontend**: `LoginComponent` at `/login`; `LoginEmailCodeComponent` multi-step OTP flow; all strings via `| translate`.

### `admin-workflow-ui` ✅ Implemented
**User Story**: Admins view all client engagements in a dashboard table and manage per-client engagements (create, transition status, view history) from the client detail view.
**Frontend**: `AdminWorkflowComponent` at `/admin/workflow` — table with Client Name / Business Type / Tax Year / Status / Last Updated / Last Updated By; status and business-type `mat-select` filters using `computed()`. `AdminClientWorkflowComponent` at `/admin/clients/:id/workflow` — expandable engagement rows with lazy history fetch; "New Engagement" and "Change Status" Material dialogs with optional note field. Both routes guarded by `authGuard + adminGuard`.
**Acceptance Criteria**: Dashboard shows all engagements; filters correctly reduce visible rows; per-client view creates engagements, transitions status with note, and displays full history.

### `client-engagement-workflow` ✅ Implemented
**User Story**: Admins open a per-tax-year engagement for any client, transition it through a five-state lifecycle, and the system automatically emails the linked client on four key milestones.
**Backend**: `ClientEngagement` entity (UNIQUE client_id + tax_year) + `ClientEngagementHistory` audit table (V14 migration). `ClientEngagementService` — any-to-any state transitions, history recorded on every change including initial creation (from_status = null). Bilingual (EN/ZH) email via `JavaMailSender` on IN_PROCESSING / PENDING_CLIENT_REVIEW / SUBMIT_TO_CRA / COMPLETED; mail failure swallowed (status still persists). Cross-admin ownership enforced via `findClientForAdmin()` helper; `GET /api/admin/engagements` filtered to calling admin's clients.
**Acceptance Criteria**: Only one engagement per client per tax year (409 on duplicate); history entry created on every transition; emails sent in user's preferred language; admin cannot see or modify another admin's engagements.

### `client-management` ✅ Implemented
**User Story**: Admins create and manage client records scoped to their ownership, with email uniqueness enforced, each client linked to a registered user account, and business type + fiscal year end tracked.
**Backend**: `clients.email` NOT NULL + UNIQUE; `clients.admin_id` NOT NULL FK to `users`; CRUD queries filtered by `admin_id`; `POST /api/clients` validates email against users table (400) and duplicate guard (409). `business_type` VARCHAR(20) NOT NULL (PERSONAL/CORPORATE/SELF_EMPLOYED); `fiscal_year_end_month` / `fiscal_year_end_day` SMALLINT NOT NULL (V13 migration); PERSONAL always stores 12/31; CORPORATE/SELF_EMPLOYED require valid `MonthDay`.
**Frontend**: Add Client dialog — email field triggers debounced lookup, auto-fills name on match, blocks submission for unregistered/duplicate email; business type select; conditional FYE month/day inputs (hidden for PERSONAL).
**Acceptance Criteria**: Admin can only see and create their own clients; duplicate emails and unregistered emails are rejected; FYE is immutable for PERSONAL clients; invalid calendar dates (e.g. Feb 30) are rejected.

### `client-portal-ui` ✅ Implemented
**User Story**: Authenticated clients access a dashboard, documents, and messages through a guarded portal.

### `client-registration` ⚠️ Superseded
**User Story**: New clients register an account linked to their client record.
**Note**: Superseded by `email-otp-auth` — account creation now happens inline on first email-code login. `/register` route and `RegisterComponent` removed.

### `contact-page` ✅ Implemented
**User Story**: Visitors view office contact details and a map on the `/contact` page.

### `email-otp-auth` ✅ Implemented
**User Story**: Clients sign in with a 6-digit email code; first-time users create an account by supplying a display name after code verification — no password required.
**Backend**: `POST /api/auth/email/request-code` (BCrypt-hashed code in `email_login_codes`, SMTP delivery); `POST /api/auth/email/verify-code` (JWT on match, signup token if new email); `POST /api/auth/email/complete-signup` (creates user, issues JWT). Rate limits: 10-min expiry, 5 attempts/code, 60s resend cooldown, 5 codes/email/hour.
**Frontend**: `LoginEmailCodeComponent` — three-step flow (email → code → name for new users); Angular Material card design matching login page; routes into auth via `AuthService`.
**Acceptance Criteria**: Existing user can log in with just their email; new email results in account creation after name step; wrong/expired/reused codes are rejected.

### `email-password-auth` ⚠️ Superseded
**User Story**: Clients authenticate with email and password (legacy; superseded by email-code OTP).
**Note**: Superseded by `email-otp-auth` — `POST /api/auth/login`, `password_hash` column, and `LoginEmailComponent` removed.

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
