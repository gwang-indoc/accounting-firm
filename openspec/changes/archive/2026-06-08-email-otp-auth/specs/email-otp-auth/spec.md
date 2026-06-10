## ADDED Requirements

### Requirement: Request a one-time login code by email
The system SHALL expose `POST /api/auth/email/request-code` accepting an `email`. For any syntactically valid email, the system SHALL generate a 6-digit numeric code, store only its BCrypt hash in `email_login_codes` with a 10-minute expiry, send the plaintext code to that email via the existing SMTP mail sender, and return a uniform success response. The endpoint SHALL be publicly accessible and SHALL NOT reveal whether the email already has an account.

#### Scenario: Code requested for a known email
- **WHEN** a POST to `/api/auth/email/request-code` is made with an `email` that exists in `users`
- **THEN** the system returns HTTP 200 with a uniform body (e.g. `{ "status": "code_sent" }`)
- **THEN** a row is inserted into `email_login_codes` with `code_hash` set, `expires_at` 10 minutes out, `attempts = 0`, `consumed_at = NULL`
- **THEN** an email containing the 6-digit code is sent to that address

#### Scenario: Code requested for an unknown email
- **WHEN** a POST to `/api/auth/email/request-code` is made with an `email` that does NOT exist in `users`
- **THEN** the system returns HTTP 200 with the SAME uniform body as the known-email case
- **THEN** a code row is created and an email is sent (no account is created yet)

#### Scenario: Endpoint is publicly accessible
- **WHEN** an unauthenticated request is made to `POST /api/auth/email/request-code`
- **THEN** Spring Security permits the request without requiring a JWT cookie

#### Scenario: Plaintext code is never persisted
- **WHEN** a code is generated
- **THEN** the `email_login_codes` row stores a BCrypt hash of the code, never the plaintext

### Requirement: Verify a login code and branch on account existence
The system SHALL expose `POST /api/auth/email/verify-code` accepting `email` and `code`. It SHALL match the code against the latest unconsumed, unexpired `email_login_codes` row for that email. On a valid match where the email already has a `users` row, the system SHALL mark the code consumed and issue the same `httpOnly`, `SameSite=Strict` JWT cookie as the Google OAuth2 flow. On a valid match where the email has no `users` row, the system SHALL mark the code consumed, issue NO JWT cookie, and return a one-time short-lived signup credential indicating the name step is required.

#### Scenario: Valid code for an existing user authenticates
- **WHEN** a POST to `/api/auth/email/verify-code` is made with a correct, unexpired code for an email that exists in `users`
- **THEN** the system returns HTTP 200 with body `{ "status": "authenticated" }`
- **THEN** the response sets an `httpOnly`, `SameSite=Strict` JWT cookie not readable by JavaScript
- **THEN** the matched code row's `consumed_at` is set
- **THEN** `UserClientLinkService.linkIfPossible` is invoked for the user

#### Scenario: Valid code for a new email requires signup
- **WHEN** a POST to `/api/auth/email/verify-code` is made with a correct, unexpired code for an email NOT in `users`
- **THEN** the system returns HTTP 200 with body `{ "status": "signup_required", "signupToken": "<token>" }`
- **THEN** NO JWT cookie is set and NO `users` row is created
- **THEN** the matched code row's `consumed_at` is set

#### Scenario: Wrong code is rejected
- **WHEN** the submitted `code` does not match the stored hash for the latest active code
- **THEN** the system returns HTTP 401
- **THEN** the matched code row's `attempts` is incremented

#### Scenario: Expired code is rejected
- **WHEN** the latest code row for the email has `expires_at` in the past
- **THEN** the system returns HTTP 401 and does not authenticate

#### Scenario: Already-consumed code is rejected
- **WHEN** the code being submitted belongs to a row whose `consumed_at` is already set
- **THEN** the system returns HTTP 401

### Requirement: Complete first-time signup with a display name
The system SHALL expose `POST /api/auth/email/complete-signup` accepting the one-time signup credential from the verify step and a `name`. It SHALL validate the credential, create a `users` row with the verified email, the given name, `role = USER`, and no password, issue the JWT cookie, and invoke client auto-linking. The credential SHALL be single-use.

#### Scenario: Successful signup creates the account and logs in
- **WHEN** a POST to `/api/auth/email/complete-signup` is made with a valid signup credential and a `name` of 1–255 trimmed characters
- **THEN** the system returns HTTP 200
- **THEN** a new `users` row exists with the verified `email`, the given `name`, `role = USER`, and no password
- **THEN** the response sets the `httpOnly`, `SameSite=Strict` JWT cookie
- **THEN** `UserClientLinkService.linkIfPossible` is invoked for the new user

#### Scenario: Missing or blank name is rejected
- **WHEN** the `name` is absent, empty, or whitespace-only
- **THEN** the system returns HTTP 400 and no account is created

#### Scenario: Invalid or reused signup credential is rejected
- **WHEN** the signup credential is missing, malformed, expired, or already used
- **THEN** the system returns HTTP 401 and no account is created

### Requirement: Login codes are expiry-, attempt-, and rate-limited
The system SHALL enforce: each code expires 10 minutes after creation; a code is invalidated after 5 failed verify attempts; a given email may receive at most one new code per 60-second cooldown; and a given email may request at most 5 codes per rolling hour. Requests exceeding the cooldown or hourly cap SHALL be rejected without sending a new email.

#### Scenario: Code invalidated after max attempts
- **WHEN** 5 failed verify attempts have been made against a code
- **THEN** further verification against that code returns HTTP 401 even if the correct code is later supplied

#### Scenario: Resend cooldown enforced
- **WHEN** a second `request-code` for the same email arrives within 60 seconds of the previous one
- **THEN** the system returns HTTP 429 and does not send a new email

#### Scenario: Hourly request cap enforced
- **WHEN** a 6th `request-code` for the same email arrives within one rolling hour
- **THEN** the system returns HTTP 429 and does not send a new email

### Requirement: email_login_codes persistence and password_hash removal via Flyway
The system SHALL create the `email_login_codes` table via a new Flyway migration with columns `id`, `email`, `code_hash`, `expires_at`, `attempts`, `consumed_at`, and `created_at`. A separate new Flyway migration SHALL drop the `users.password_hash` column. No code path SHALL read `password_hash` after this change.

#### Scenario: Migration creates the code table
- **WHEN** Flyway runs on a clean database
- **THEN** an `email_login_codes` table exists with the specified columns
- **THEN** `expires_at` and `code_hash` are NOT NULL

#### Scenario: Migration drops password_hash
- **WHEN** Flyway runs the drop migration
- **THEN** the `users` table no longer has a `password_hash` column
- **THEN** the application boots and existing users authenticate via email-code

### Requirement: Frontend email-code login flow
The system SHALL render a standalone Angular email-code login flow reachable from `/login`, presenting three steps: an email entry step, a code entry step, and (only for new emails) a name entry step. The components SHALL use Angular Material (`mat-card`, `mat-form-field`, `matInput`, `mat-flat-button`) and follow the existing login design system (dot-grid background, sky-blue accent stripe, GWH brand block). On final authentication the app SHALL call `loadCurrentUser()` and navigate to `/portal/dashboard`.

#### Scenario: Email step requests a code
- **WHEN** the user enters a valid email and submits the email step
- **THEN** the app calls `request-code` and advances to the code entry step
- **THEN** a message indicates a code was sent to the email

#### Scenario: Code step authenticates an existing user
- **WHEN** the user enters a code and the backend responds `{ "status": "authenticated" }`
- **THEN** the app calls `loadCurrentUser()` and navigates to `/portal/dashboard`

#### Scenario: Code step advances new users to the name step
- **WHEN** the backend responds `{ "status": "signup_required" }`
- **THEN** the app advances to the name entry step

#### Scenario: Name step completes signup
- **WHEN** a new user submits a name on the name step
- **THEN** the app calls `complete-signup`, then `loadCurrentUser()`, and navigates to `/portal/dashboard`

#### Scenario: Invalid code shows an inline error
- **WHEN** the backend returns HTTP 401 on the code step
- **THEN** an inline error banner with `data-testid="login-error"` is shown

### Requirement: AuthService exposes email-code methods
The system SHALL provide `AuthService` methods to drive the flow: `requestEmailCode(email)`, `verifyEmailCode(email, code)`, and `completeEmailSignup(token, name)`, each calling the corresponding backend endpoint with `withCredentials`. `AuthService` SHALL NOT expose password `register`/`loginWithEmail` methods after this change.

#### Scenario: Request code method
- **WHEN** `requestEmailCode(email)` is called
- **THEN** it POSTs to `/api/auth/email/request-code` with the email

#### Scenario: Verify code method returns branch result
- **WHEN** `verifyEmailCode(email, code)` is called
- **THEN** it POSTs to `/api/auth/email/verify-code` and resolves with the backend status (`authenticated` or `signup_required` + token)

#### Scenario: Password methods removed
- **WHEN** the AuthService source is inspected
- **THEN** no `register` or `loginWithEmail` method exists
