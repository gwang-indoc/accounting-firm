## ADDED Requirements

### Requirement: Google OAuth2 login issues a JWT httpOnly cookie
The system SHALL authenticate users via Google OAuth2. The OAuth2 flow is initiated at `GET /oauth2/authorization/google` (Spring Security's built-in entry point). On successful authentication, the system SHALL issue a signed JWT stored as an `httpOnly`, `SameSite=Strict` cookie. The cookie SHALL NOT be accessible to JavaScript.

#### Scenario: First-time login creates a user record
- **WHEN** a user completes Google OAuth2 for the first time
- **THEN** the system creates a `users` row with their `google_sub`, `email`, `name`, and `role = 'USER'`
- **THEN** the system issues a JWT cookie and redirects to `/portal/dashboard`

#### Scenario: Returning user updates email and name
- **WHEN** a returning user completes Google OAuth2
- **THEN** the system looks up the user by `google_sub`, updates `email` and `name` if changed
- **THEN** the system issues a JWT cookie and redirects to `/portal/dashboard`

#### Scenario: JWT cookie is httpOnly
- **WHEN** the JWT cookie is set on the response
- **THEN** the cookie attributes SHALL include `HttpOnly`, `SameSite=Strict`, and `Path=/`
- **THEN** JavaScript running in the browser MUST NOT be able to read the cookie value

### Requirement: JWT filter authenticates subsequent requests
The system SHALL validate the JWT cookie on every incoming request and set the Spring `SecurityContext` accordingly.

#### Scenario: Valid JWT cookie grants access
- **WHEN** a request arrives with a valid, non-expired JWT cookie
- **THEN** the system sets the authenticated principal in the `SecurityContext`
- **THEN** the request proceeds to the controller

#### Scenario: Missing or invalid JWT cookie is rejected
- **WHEN** a request arrives with no JWT cookie, a malformed token, or an expired token
- **THEN** the system returns HTTP 401 for protected endpoints
- **THEN** the `SecurityContext` remains unauthenticated

### Requirement: /api/auth/me returns current user
The system SHALL expose `GET /api/auth/me` which returns the authenticated user's details.

#### Scenario: Authenticated request returns user DTO
- **WHEN** an authenticated request is made to `GET /api/auth/me`
- **THEN** the system returns HTTP 200 with `{ id, email, name, role }`

#### Scenario: Unauthenticated request is rejected
- **WHEN** an unauthenticated request is made to `GET /api/auth/me`
- **THEN** the system returns HTTP 401

### Requirement: /api/auth/logout clears the JWT cookie
The system SHALL expose `POST /api/auth/logout` which invalidates the session by clearing the JWT cookie.

#### Scenario: Logout clears cookie
- **WHEN** an authenticated user calls `POST /api/auth/logout`
- **THEN** the system responds with HTTP 200
- **THEN** the response sets the JWT cookie with `Max-Age=0` to clear it from the browser
