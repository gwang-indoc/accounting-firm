## Purpose
Provides email-and-password authentication for users who registered without Google OAuth2, including a backend login endpoint and an Angular Material login form at `/login/email`.
## Requirements
### Requirement: Capability superseded by email-otp-auth
This capability SHALL be considered superseded. All password-based login flows are now replaced by `email-otp-auth` (passwordless email-code authentication).

#### Scenario: No password login endpoint or UI
- **WHEN** a user needs to authenticate
- **THEN** they do so via the email-code login flow at `/login`, not a password-based form

