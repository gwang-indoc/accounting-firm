---
Date: 2026-06-07
Change: email-otp-auth
Status: REVIEWED
---

# email-otp-auth Requirements

## Goals

- Add passwordless email login: user enters an email, receives a one-time code, enters the code, and is logged in.
- First login auto-creates the account; the user supplies a display name once, after verifying the code.
- Returning login is email → code → in (no name step).
- Replace the existing email/password flow entirely (registration + password login) with this email-code flow.
- Leave Google OAuth2 login untouched as a parallel option.
- Reuse the existing JWT httpOnly cookie session model — email-code login issues the same cookie as Google/password login does today.

## Non-Goals

- No change to Google OAuth2 login.
- No magic-link (click-a-URL) login; codes are typed in.
- No SMS / phone codes.
- No "remember this device" / skip-code-on-trusted-device behavior.
- No profile-editing screen; name is captured once at signup and not editable in this change.
- No new email provider; reuse existing prod SMTP.
- No account-recovery or email-change flow.

## Constraints

- Stack: Spring Boot 3.5 / Java 21 / PostgreSQL backend; Angular 21 (zoneless, signals) frontend.
- Codes delivered via existing `spring-boot-starter-mail` + prod SMTP (confirmed working in prod).
- Schema changes via new Flyway migration only — never edit existing migrations.
- JWT secret ≥ 32 chars; cookie remains httpOnly, SameSite=Strict, Secure in prod.
- Codes must never be stored in plaintext — store a BCrypt hash, same as `password_hash` handling today.
- Code policy (locked): 6-digit numeric code; 10-minute expiry; max 5 verify attempts per code, then the code is invalidated; 60-second resend cooldown per email; max 5 code requests per email per rolling hour.
- New table `email_login_codes`: `id`, `email`, `code_hash`, `expires_at`, `attempts`, `consumed_at`, `created_at`. (Exact column types finalized at spec time; shape is locked.)
- No account row is created until the user has BOTH verified a valid code AND supplied a name. (The mechanism carrying "verified email awaiting name" between steps is a design.md decision, not a requirements gap.)
- No email enumeration: requesting a code returns a uniform "code sent" response regardless of whether the email is known or new; the new-vs-known branch happens only after a valid code is entered.
- Name at signup: required, trimmed, 1–255 chars.
- `password_hash` column is dropped in this change via Flyway migration. No code path may read `password_hash` after this change.
- Backend tests use `@DataJpaTest` / `@WebMvcTest` / `@SpringBootTest` against local PostgreSQL (no Testcontainers).
- Frontend tests: Vitest + TestBed. E2E: committed Playwright test for the new flow.

## Success Criteria

- A brand-new email can: request a code, receive it by email, enter it, supply a name, and land authenticated on `/portal/dashboard` with a valid JWT cookie and a `users` row (email + name, no password).
- A known email can: request a code, enter it, and land authenticated — no name prompt.
- Existing accounts (created previously via Google or password) can log in via email-code by email match; no data loss.
- Expired codes (> 10 min), already-used codes, and codes past the max attempt count are rejected.
- Resend is rate-limited (cooldown + hourly cap); abuse does not create unbounded code rows or emails.
- The removed password endpoints (`POST /api/auth/register`, `POST /api/auth/login`) and their UI (`/register`, `/login/email`) no longer exist; `/login` no longer offers password sign-in.
- `password_hash` column dropped via Flyway migration; app still boots and all existing users authenticate.
- Backend + frontend unit tests pass; a Playwright E2E covers new-user signup and returning-user login.

## User Stories

- As a new client, I want to sign in with just my email and a code so that I do not have to create or remember a password.
- As a new client, I want to enter my name once after verifying my email so that the portal shows my name rather than my email address.
- As a returning client, I want to enter my email and a code and get straight in so that login is fast.
- As a client who previously registered with a password, I want my existing account to keep working via email-code so that nothing breaks for me.
- As an operator, I want login codes hashed, expiring, attempt-limited, and rate-limited so that the flow resists brute force and email-bombing.

## Open Questions

All requirements-level questions resolved during review (see Constraints for locked
values). The following is deferred to design.md by intent — it is a HOW, not a WHAT:

- D-01 (design.md): mechanism that carries "email verified, awaiting name" between the
  verify step and account creation for new users. Candidates: short-lived signup token
  issued on verify and exchanged when the name is submitted, vs. create row with
  name=null then patch. The requirement ("no account until verified code + name") is
  locked; only the implementation choice is open.

## Referenced Capabilities

- ADD `email-otp-auth` — new: request login code, verify code + issue JWT, first-login account creation with name capture, code expiry/attempt/rate-limit rules.
- REMOVE `email-password-auth` — "Users can log in with email and password" + "LoginEmailComponent ... email/password login form" go away (replaced by email-code).
- REMOVE `client-registration` — "New users can register with email and password" + "RegisterComponent" go away (signup now happens implicitly on first email-code login).
- MODIFY `client-login-page` — "/login page presents all auth options" updated: password sign-in option replaced by email-code option (Google option unchanged).
- MODIFY `google-oauth2-auth` — unchanged behavior, but `/api/auth/me` and `/api/auth/logout` are reused by the new flow; reference only (no SHALL change expected).
