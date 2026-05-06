## MODIFIED Requirements

### Requirement: Google OAuth2 login issues a JWT httpOnly cookie
The system SHALL authenticate users via Google OAuth2. The OAuth2 flow is initiated at `GET /oauth2/authorization/google` (Spring Security's built-in entry point). On successful authentication, the system SHALL issue a signed JWT stored as an `httpOnly`, `SameSite=Strict` cookie. The cookie SHALL NOT be accessible to JavaScript. The `users.google_sub` column SHALL be nullable to allow email/password-only accounts to coexist in the same table.

#### Scenario: First-time login creates a user record
- **WHEN** a user completes Google OAuth2 for the first time
- **THEN** the system creates a `users` row with their `google_sub`, `email`, `name`, and `role = 'USER'`
- **THEN** `password_hash` is NULL for Google-authenticated users
- **THEN** the system issues a JWT cookie and redirects to `/portal/dashboard`

#### Scenario: Returning user updates email and name
- **WHEN** a returning user completes Google OAuth2
- **THEN** the system looks up the user by `google_sub`, updates `email` and `name` if changed
- **THEN** the system issues a JWT cookie and redirects to `/portal/dashboard`

#### Scenario: JWT cookie is httpOnly
- **WHEN** the JWT cookie is set on the response
- **THEN** the cookie attributes SHALL include `HttpOnly`, `SameSite=Strict`, and `Path=/`
- **THEN** JavaScript running in the browser MUST NOT be able to read the cookie value
