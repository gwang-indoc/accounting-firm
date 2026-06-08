## Purpose
Allows new users to self-register an account via email and password, providing a backend registration endpoint and an Angular Material registration form.
## Requirements
### Requirement: Capability superseded by email-otp-auth
This capability SHALL be considered superseded. All registration flows are now handled by `email-otp-auth` (email-code login with implicit account creation on first login).

#### Scenario: No standalone registration endpoint or UI
- **WHEN** a user needs to create an account
- **THEN** they do so via the email-code login flow at `/login`, not a separate `/register` route

