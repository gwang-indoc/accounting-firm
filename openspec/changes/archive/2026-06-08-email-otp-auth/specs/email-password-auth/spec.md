## REMOVED Requirements

### Requirement: Users can log in with email and password
**Reason**: Password login is replaced by passwordless email-code (OTP) login. The `POST /api/auth/login` endpoint and `password_hash` comparison are removed.
**Migration**: Existing accounts (including those created with a password) sign in via the new email-code flow on the same `email` — see the `email-otp-auth` capability. The `users.password_hash` column is dropped by Flyway migration in this change.

### Requirement: LoginEmailComponent presents an email/password login form using Angular Material
**Reason**: The `/login/email` password form is replaced by the multi-step email-code login flow.
**Migration**: Users sign in via the new email-code login flow reachable from `/login` (see `email-otp-auth`). The `/login/email` route and `LoginEmailComponent` are removed.

## ADDED Requirements

### Requirement: Capability superseded by email-otp-auth
This capability SHALL be considered superseded. All password-based login flows are now replaced by `email-otp-auth` (passwordless email-code authentication).

#### Scenario: No password login endpoint or UI
- **WHEN** a user needs to authenticate
- **THEN** they do so via the email-code login flow at `/login`, not a password-based form
