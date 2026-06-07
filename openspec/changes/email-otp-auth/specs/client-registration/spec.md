## REMOVED Requirements

### Requirement: New users can register with email and password
**Reason**: Explicit password registration is replaced by implicit account creation on first email-code login. The `POST /api/auth/register` endpoint is removed.
**Migration**: New users create an account by requesting an email code, verifying it, and supplying a display name — see the `email-otp-auth` capability. No password is collected or stored.

### Requirement: RegisterComponent presents a registration form using Angular Material
**Reason**: The `/register` form is replaced by the email-code signup steps (email → code → name) within the email-code login flow.
**Migration**: Signup happens inline in the email-code flow reachable from `/login` (see `email-otp-auth`). The `/register` route and `RegisterComponent` are removed.
