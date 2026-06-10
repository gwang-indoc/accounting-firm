---
Date: 2026-06-07
Change: email-otp-auth
Requirements: requirements.md
---

## Why

Passwords are friction and a liability for a client portal: users forget them, reset flows are extra surface, and a stored hash is a breach target. A passwordless email-code login lets a client sign in with just their email — first code creates the account, every later code logs them straight in — while Google OAuth stays available.

## What Changes

- Add passwordless email-code (OTP) login: request a code by email, receive it via SMTP, enter the 6-digit code, get a JWT cookie.
- First-time email auto-creates the account; the new user supplies a display name once, after the code is verified. Returning emails skip the name step.
- Add a new `email_login_codes` table (Flyway) storing BCrypt-hashed codes with expiry, attempt count, and consumption marker.
- Enforce code policy: 10-min expiry, 5 verify attempts/code, 60s resend cooldown, 5 requests/email/hour.
- Uniform "code sent" response regardless of whether the email is known (no enumeration).
- **BREAKING** Remove email/password registration and login: delete `POST /api/auth/register`, `POST /api/auth/login`, the `/register` and `/login/email` routes/components, and drop the `password_hash` column via Flyway migration. Existing password-created accounts keep working — they log in by email-code on the same `email`.
- `/login` page replaces its password sign-in option with the email-code option; Google option unchanged.
- Reuse existing `/api/auth/me` and `/api/auth/logout` and the existing JWT cookie model unchanged.

## Capabilities

### New Capabilities

- `email-otp-auth` — request login code, verify code + issue JWT cookie, first-login account creation with one-time name capture, and the code expiry/attempt/rate-limit/no-enumeration rules.

### Modified Capabilities

- `client-login-page` — the `/login` page's auth-option set changes: email/password sign-in option replaced by an email-code sign-in option (Google option unchanged).
- `email-password-auth` — **REMOVED**: "Users can log in with email and password" and the `LoginEmailComponent` email/password form are removed (replaced by email-code).
- `client-registration` — **REMOVED**: "New users can register with email and password" and `RegisterComponent` are removed; signup now happens implicitly on first email-code login.

## Impact

- **Backend code**: new `auth` controller endpoints (request-code, verify-code, complete-signup); new service + repository + `EmailLoginCode` entity; new Flyway migrations (create `email_login_codes`, drop `password_hash`); remove `AuthService.register/login`, `RegisterRequest`/`LoginRequest` paths from `AuthController`; reuse `JwtService`, `OAuth2SuccessHandler` cookie logic, `UserClientLinkService`, existing `MailSender`.
- **Backend config**: `SecurityConfig` open-paths already cover `/api/auth/**`; no new public-path entry expected.
- **Frontend code**: new email-code login UI (email → code → name) replacing `login-email` + `register` components; `AuthService` gains request-code/verify-code/complete-signup methods and drops `register`/`loginWithEmail`; `/login` template updated; routes `/register` and `/login/email` removed.
- **APIs**: removes `POST /api/auth/register`, `POST /api/auth/login`; adds email-code endpoints.
- **DB**: adds `email_login_codes`; drops `users.password_hash`.
- **Dependencies**: none new — reuses `spring-boot-starter-mail` + prod SMTP.
- **Tests**: backend slice/integration tests for code lifecycle + endpoints; frontend Vitest for new components/service; Playwright E2E for new-user signup and returning-user login.

## Out of Scope

- Magic-link (click-URL) login, SMS codes, "remember this device".
- Profile-editing screen (name editable after signup) — deferred.
- Account recovery / email-change flow.
- Any change to Google OAuth2 behavior.
- New email provider — existing prod SMTP is reused.
