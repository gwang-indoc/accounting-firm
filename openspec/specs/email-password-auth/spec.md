## Requirements

### Requirement: Users can log in with email and password
The system SHALL allow registered users to authenticate via `POST /api/auth/login`. On success, the system SHALL issue the same `httpOnly`, `SameSite=Strict` JWT cookie as the Google OAuth2 flow.

#### Scenario: Successful login
- **WHEN** a POST to `/api/auth/login` is made with a valid `email` and correct `password`
- **THEN** the system returns HTTP 200
- **THEN** the response sets an `httpOnly`, `SameSite=Strict` JWT cookie
- **THEN** the cookie is not readable by JavaScript

#### Scenario: Unknown email
- **WHEN** the submitted `email` does not exist in the `users` table
- **THEN** the system returns HTTP 401

#### Scenario: Wrong password
- **WHEN** the submitted `password` does not match the stored BCrypt hash
- **THEN** the system returns HTTP 401

#### Scenario: Google-only account cannot use password login
- **WHEN** the user was registered via Google OAuth2 (`password_hash IS NULL`)
- **THEN** the system returns HTTP 401 (no password hash to compare against)

#### Scenario: Endpoint is publicly accessible
- **WHEN** an unauthenticated request is made to `POST /api/auth/login`
- **THEN** Spring Security permits the request without requiring a JWT cookie

### Requirement: LoginEmailComponent presents an email/password login form using Angular Material
The system SHALL render `LoginEmailComponent` at `/login/email` as a standalone Angular component. The form SHALL use `mat-card`, `mat-form-field`, `mat-input`, `mat-error`, and `mat-flat-button`.

#### Scenario: Form fields
- **WHEN** the `/login/email` route is active
- **THEN** the page renders a `mat-card` with Email and Password `mat-form-field` inputs and a "Sign In" `mat-flat-button`

#### Scenario: Invalid credentials error
- **WHEN** the backend returns HTTP 401
- **THEN** a `mat-error` or inline error message is shown: "Invalid email or password"

#### Scenario: Successful login navigates to portal
- **WHEN** the backend returns HTTP 200 (JWT cookie set)
- **THEN** Angular navigates to `/portal`

#### Scenario: Back to login link
- **WHEN** the user clicks "← Back to Login"
- **THEN** Angular navigates to `/login`
