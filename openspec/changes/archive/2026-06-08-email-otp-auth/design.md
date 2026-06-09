---
Date: 2026-06-07
Change: email-otp-auth
---

## Context

The app authenticates via Google OAuth2 and via email/password (`/api/auth/register`, `/api/auth/login`), both issuing the same `httpOnly`, `SameSite=Strict` JWT cookie through `JwtService`. This change replaces the password flow with passwordless email-code (OTP) login: a user enters an email, receives a 6-digit code by SMTP, enters it, and is logged in; the first code for an unknown email creates the account after a one-time name prompt. Google login is untouched. Requirements: `requirements.md`. Capability contracts: `specs/email-otp-auth/spec.md` (new), plus REMOVED `email-password-auth` / `client-registration` and MODIFIED `client-login-page`.

Existing reusable pieces: `JwtService.issueToken`, `AuthController.buildJwtCookie`, `UserClientLinkService.linkIfPossible`, the BCrypt `PasswordEncoder` bean, `spring-boot-starter-mail` (prod SMTP confirmed working, already used by the contact form), and `SecurityConfig` which already `permitAll`s `/api/auth/**`.

## Goals / Non-Goals

**Goals**
- Three backend endpoints under `/api/auth/email/**`: request-code, verify-code, complete-signup.
- Codes hashed at rest, expiring, attempt-capped, rate-limited; no email enumeration.
- First-login account creation gated on a verified code AND a supplied name.
- Reuse existing JWT cookie + client-linking machinery unchanged.
- Remove password endpoints/UI and drop `password_hash`.

**Non-Goals**
- Magic links, SMS, trusted-device skip, profile editing, account recovery, per-IP rate limiting (per-email only here), any Google-flow change.

## Decisions

### D1: Carry "verified email awaiting name" as a signed signup token (resolves requirements D-01)
On verifying a code for an unknown email, return a short-lived **signed JWT** (purpose claim `signup`, subject = verified email, 10-min expiry) in the response body — NOT a session cookie. `complete-signup` validates this token, then creates the user. Reuses `JwtService` signing infra; stateless, no extra table.

- **Alternative considered:** create a `users` row with `name = NULL` on verify, then PATCH the name. Rejected — leaves half-built accounts if the user abandons the name step, and the requirements explicitly forbid an account before name is supplied.
- **Single-use enforcement:** the `users.email` UNIQUE constraint makes replay harmless — a replayed signup token whose email now exists is rejected (account already created → HTTP 401/409). We do not track token consumption server-side.

### D2: Code generation, storage, and matching
- Generate with `SecureRandom`: integer in `[0, 999999]`, zero-padded to 6 digits.
- Store `BCrypt(code)` in `email_login_codes.code_hash`. Never persist plaintext.
- On verify: select the latest row for the email where `consumed_at IS NULL AND expires_at > now()`, ordered by `created_at DESC`. `passwordEncoder.matches(code, row.code_hash)`. On mismatch increment `attempts`; at `attempts >= 5` the row is dead (subsequent matches rejected). On match set `consumed_at`.

### D3: Rate limiting (per email, DB-derived — no new infra)
- **Cooldown:** reject `request-code` if a row for that email has `created_at` within the last 60s → HTTP 429.
- **Hourly cap:** reject if `COUNT(*)` of rows for that email with `created_at` within the last hour `>= 5` → HTTP 429.
- Both computed by repository count/exists queries; no scheduler, no cache.

### D4: Uniform response + email-send failure
- request-code returns the same `{ "status": "code_sent" }` body for known and unknown emails (no enumeration). The new-vs-known branch is exposed only by verify-code, after a valid code.
- Mail send is **synchronous and fatal here** (unlike the contact form): if `JavaMailSender` throws, return HTTP 502 — uniform for known/unknown, leaking nothing — so the user knows to retry. The code row remains and simply expires.

### D5: Cookie issuance reuse
verify-code (existing user) and complete-signup both issue the JWT cookie. Extract the cookie-building currently in `AuthController.buildJwtCookie` into a shared helper (or call the existing method) so all three issuance sites — OAuth2 handler, verify, complete-signup — produce identical cookies. No change to cookie attributes.

### D6: Removal scope
- Backend: delete `register`/`login` handlers from `AuthController`, `AuthService.register/login`, `RegisterRequest`/`LoginRequest` DTOs, and their tests.
- Frontend: delete `RegisterComponent`, `LoginEmailComponent`, routes `/register` and `/login/email`; remove `AuthService.register`/`loginWithEmail`. Update `LoginComponent` to offer Google + email-code.
- DB: `V10__drop_password_hash.sql` drops `users.password_hash`. Confirm no remaining reader (the User entity loses the field).

### D7: Migrations
- `V9__create_email_login_codes.sql`: `id BIGSERIAL PK, email VARCHAR(255) NOT NULL, code_hash VARCHAR(255) NOT NULL, expires_at TIMESTAMP NOT NULL, attempts INT NOT NULL DEFAULT 0, consumed_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW()`. Index on `(email, created_at DESC)` for the latest-row and rate-limit queries.
- `V10__drop_password_hash.sql`: `ALTER TABLE users DROP COLUMN password_hash;`

## Risks / Trade-offs

- **Timing enumeration:** BCrypt runs only when a code row exists; response timing could hint at code-row existence (not account existence — uniform there). → Low signal; accept. Code rows exist for both known and unknown emails after request-code, so verify timing does not reveal account existence.
- **Email bombing of arbitrary addresses:** anyone can trigger a code email to any address. → Per-email cooldown + hourly cap bound it; per-IP limiting deferred (noted Out of Scope).
- **Signup token replay:** stateless token reusable until expiry. → Harmless via `email` UNIQUE constraint; replayed token after account exists is rejected.
- **Stuck user if SMTP down:** fatal 502 on send failure. → Matches reality (no code = no login); prod SMTP confirmed working; user retries.
- **Dropping password_hash is irreversible forward:** existing password users keep their `email`, so they log in via code with no data loss; only the (now unused) hash is gone.

## Migration Plan

1. Ship `V9` (create table) and `V10` (drop column) together; Flyway applies in order on deploy.
2. Deploy backend (new endpoints live, old register/login removed) and frontend (new flow) together — they are a coupled BREAKING change.
3. Rollback: revert the deploy; re-adding `password_hash` would require a new forward migration (column data is not recoverable, but password login is being abandoned, so rollback would simply restore the prior build + empty column). Given the coupling, prefer roll-forward.

## Open Questions

None blocking. D1 (signup-token mechanism) resolved above. Exact email body copy/wording is an implementation detail decided during the email-template task.
