pause# Tasks — email-otp-auth

## 1. Code persistence + lifecycle service (backend engine)

### Contract
- **Spec**: The system SHALL create the `email_login_codes` table via a new Flyway migration with columns `id`, `email`, `code_hash`, `expires_at`, `attempts`, `consumed_at`, and `created_at`. // For any syntactically valid email, the system SHALL generate a 6-digit numeric code, store only its BCrypt hash in `email_login_codes` with a 10-minute expiry. // The system SHALL enforce: each code expires 10 minutes after creation; a code is invalidated after 5 failed verify attempts. // Plaintext code is never persisted (store a BCrypt hash, never the plaintext).
- **Runtime**: `cd backend && ./mvnw test -Dtest=EmailLoginCodeServiceTest,EmailLoginCodeRepositoryTest` → expected: all tests pass; code generated as zero-padded 6 digits, stored hash matches via PasswordEncoder, expiry = created+10min, attempts increment, dead after 5.
- **Code**: D2 — `SecureRandom` int in [0,999999] zero-padded; `BCrypt(code)` via existing `PasswordEncoder` bean; verify selects latest row where `consumed_at IS NULL AND expires_at > now()` ordered by `created_at DESC`; mismatch increments `attempts`, `attempts >= 5` is dead. D7 — V9 migration + index on `(email, created_at DESC)`. Never persist plaintext.
- **Threshold**: 80

- [x] 1.0 CONTRACT — write openspec/changes/email-otp-auth/contracts/group-1.md with the ### Contract block above; confirm Spec, Runtime, Code non-empty before proceeding
- [x] 1.1 GREEN — add `V9__create_email_login_codes.sql` Flyway migration (table + index on `(email, created_at)`); verify it applies against local PostgreSQL
- [x] 1.2 RED — Invoke superpowers:test-driven-development. Write failing `@DataJpaTest` `EmailLoginCodeRepositoryTest`: persist + fetch latest active row for an email, ordered by `created_at DESC`, excluding consumed/expired
- [x] 1.3 GREEN — add `EmailLoginCode` entity + `EmailLoginCodeRepository` (finder for latest active row; count-since and exists-since queries for rate limiting) to pass 1.2
- [x] 1.4 RED — failing `EmailLoginCodeServiceTest`: `generateCode` returns a zero-padded 6-digit string and persists a row whose `code_hash` matches the plaintext via `PasswordEncoder` and never equals the plaintext
- [x] 1.5 GREEN — implement `EmailLoginCodeService.generateAndStore(email)` using `SecureRandom` + `PasswordEncoder` + 10-min `expires_at`
- [x] 1.6 RED — failing test: `verify(email, code)` returns success on correct unexpired code, increments `attempts` on mismatch, returns failure when expired, consumed, or `attempts >= 5`
- [x] 1.7 GREEN — implement `verify` (select latest active row, `passwordEncoder.matches`, attempt increment, mark `consumed_at` on success) to pass 1.6
- [x] 1.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-1.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 2. request-code endpoint (rate limit + send + uniform response)

### Contract
- **Spec**: The system SHALL expose `POST /api/auth/email/request-code` accepting an `email`. ... send the plaintext code to that email via the existing SMTP mail sender, and return a uniform success response. The endpoint SHALL be publicly accessible and SHALL NOT reveal whether the email already has an account. // The system SHALL enforce ... a given email may receive at most one new code per 60-second cooldown; and a given email may request at most 5 codes per rolling hour. Requests exceeding the cooldown or hourly cap SHALL be rejected without sending a new email.
- **Runtime**: `cd backend && ./mvnw test -Dtest=AuthEmailControllerTest -Dtest.method=requestCode*` (or the request-code `@WebMvcTest`/`@SpringBootTest` class) → expected: 200 uniform body for known + unknown email; email sent for both; 429 on cooldown and hourly-cap breach with no send; public access (no JWT required).
- **Code**: D3 — cooldown = reject if a row for the email has `created_at` within last 60s (429); hourly cap = reject if COUNT rows for email within last hour ≥ 5 (429); both via repository queries, no scheduler. D4 — identical `{ "status": "code_sent" }` body for known/unknown; mail send synchronous, on `JavaMailSender` failure return 502 (uniform). `SecurityConfig` already permits `/api/auth/**`.
- **Threshold**: 80

- [x] 2.0 CONTRACT — write openspec/changes/email-otp-auth/contracts/group-2.md with the ### Contract block above
- [x] 2.1 RED — Invoke superpowers:test-driven-development. Failing controller test: `POST /api/auth/email/request-code` returns 200 with uniform body and triggers a mail send for BOTH an existing-user email and an unknown email (mock `JavaMailSender`)
- [x] 2.2 GREEN — add request-code handler + request DTO calling `EmailLoginCodeService.generateAndStore` then sending the code email via the mail sender; uniform body
- [x] 2.3 RED — failing test: second request within 60s returns 429 with no new mail send; 6th request within an hour returns 429 with no new mail send
- [x] 2.4 GREEN — implement cooldown + hourly-cap checks (repository count/exists-since queries) before generating
- [x] 2.5 RED — failing test: when `JavaMailSender` throws, endpoint returns 502 (same for known/unknown email)
- [x] 2.6 GREEN — wrap send; map send failure to 502
- [x] 2.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-2.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 3. verify-code + complete-signup endpoints

### Contract
- **Spec**: The system SHALL expose `POST /api/auth/email/verify-code` accepting `email` and `code`. ... On a valid match where the email already has a `users` row, the system SHALL mark the code consumed and issue the same `httpOnly`, `SameSite=Strict` JWT cookie as the Google OAuth2 flow. On a valid match where the email has no `users` row, the system SHALL ... issue NO JWT cookie, and return a one-time short-lived signup credential. // The system SHALL expose `POST /api/auth/email/complete-signup` accepting the one-time signup credential ... create a `users` row with the verified email, the given name, `role = USER`, and no password, issue the JWT cookie, and invoke client auto-linking. The credential SHALL be single-use. // Missing/blank name → 400; invalid/reused credential → 401.
- **Runtime**: `cd backend && ./mvnw test -Dtest=AuthEmailControllerTest` (verify + complete-signup methods) → expected: existing-user valid code → 200 `authenticated` + JWT cookie set; new email valid code → 200 `signup_required` + token, no cookie, no user row; wrong/expired/consumed → 401; complete-signup valid token+name → 200 + cookie + new USER row; blank name → 400; bad/reused token → 401.
- **Code**: D1 — signup token = signed JWT (purpose=`signup`, sub=verified email, 10-min expiry) returned in body, NOT a cookie; complete-signup validates it then creates user; single-use enforced by `users.email` UNIQUE (replay after account exists → 401/409). D5 — reuse shared JWT-cookie builder (same attributes as OAuth2 flow) at both issuance sites; invoke `UserClientLinkService.linkIfPossible`.
- **Threshold**: 80

- [x] 3.0 CONTRACT — write openspec/changes/email-otp-auth/contracts/group-3.md with the ### Contract block above
- [x] 3.1 GREEN — extract the JWT-cookie builder from `AuthController.buildJwtCookie` into a shared helper reused by the OAuth2 handler path and the new endpoints (no cookie-attribute change)
- [x] 3.2 RED — Invoke superpowers:test-driven-development. Failing test: verify-code with a valid code for an EXISTING user → 200 `{status:authenticated}`, sets httpOnly/SameSite=Strict JWT cookie, marks code consumed, calls `linkIfPossible`
- [x] 3.3 GREEN — implement verify-code existing-user branch (reuse `EmailLoginCodeService.verify`, `JwtService.issueToken`, shared cookie builder, client linking)
- [x] 3.4 RED — failing test: verify-code with a valid code for an UNKNOWN email → 200 `{status:signup_required, signupToken}`, NO cookie, NO user row; wrong/expired/consumed code → 401
- [x] 3.5 GREEN — implement signup-token issuance (signed JWT, purpose=signup, 10-min) for the new-email branch; 401 paths
- [x] 3.6 RED — failing test: complete-signup with a valid signup token + name (1–255 trimmed) → 200, creates USER row (email, name, no password), sets JWT cookie, calls `linkIfPossible`; blank name → 400; invalid/reused/expired token → 401
- [x] 3.7 GREEN — implement complete-signup (validate signup token, create user, issue cookie, link); rely on `users.email` UNIQUE for replay safety
- [x] 3.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-3.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 4. Remove password flow + drop password_hash

### Contract
- **Spec**: REMOVED `email-password-auth` — "Users can log in with email and password" (`POST /api/auth/login` removed). REMOVED `client-registration` — "New users can register with email and password" (`POST /api/auth/register` removed). // A separate new Flyway migration SHALL drop the `users.password_hash` column. No code path SHALL read `password_hash` after this change.
- **Runtime**: `cd backend && ./mvnw test` → expected: full suite green after removal; `POST /api/auth/register` and `POST /api/auth/login` no longer mapped (404); app boots with V10 applied; no compile/reference to `password_hash` remains.
- **Code**: D6 — delete `register`/`login` handlers, `AuthService.register/login`, `RegisterRequest`/`LoginRequest` DTOs and their tests; remove `passwordHash` field from `User` entity. D7 — `V10__drop_password_hash.sql` = `ALTER TABLE users DROP COLUMN password_hash;`. Existing users keep `email` → log in via code (no data loss).
- **Threshold**: 80

- [x] 4.0 CONTRACT — write openspec/changes/email-otp-auth/contracts/group-4.md with the ### Contract block above
- [x] 4.1 RED — update/replace controller tests to assert `POST /api/auth/register` and `POST /api/auth/login` return 404 (removed); this fails until handlers are removed
- [x] 4.2 GREEN — delete `register`/`login` handlers from `AuthController`, `AuthService.register/login`, and `RegisterRequest`/`LoginRequest` DTOs; delete their now-dead tests
- [x] 4.3 GREEN — add `V10__drop_password_hash.sql`; remove the `passwordHash` field from the `User` entity; fix any references
- [x] 4.4 GREEN — run `cd backend && ./mvnw test`; confirm full suite green and app boots with V9+V10 applied
- [x] 4.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-4.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 5. Frontend AuthService email-code methods

### Contract
- **Spec**: The system SHALL provide `AuthService` methods `requestEmailCode(email)`, `verifyEmailCode(email, code)`, and `completeEmailSignup(token, name)`, each calling the corresponding backend endpoint with `withCredentials`. `AuthService` SHALL NOT expose password `register`/`loginWithEmail` methods after this change.
- **Runtime**: `cd frontend && npx ng test --include='**/auth.service.spec.ts' --no-watch` → expected: each method POSTs to its endpoint (`/api/auth/email/request-code|verify-code|complete-signup`); verify resolves with backend status; no `register`/`loginWithEmail` members exist.
- **Code**: Reuse existing `HttpClient` + `CredentialsInterceptor` (withCredentials already global). `verifyEmailCode` resolves with `{status, signupToken?}`. Remove `register`/`loginWithEmail`. Zoneless/signals — keep `currentUser` signal usage unchanged.
- **Threshold**: 80

- [x] 5.0 CONTRACT — write openspec/changes/email-otp-auth/contracts/group-5.md with the ### Contract block above
- [x] 5.1 RED — Invoke superpowers:test-driven-development. Failing Vitest spec: `requestEmailCode`, `verifyEmailCode`, `completeEmailSignup` each POST to the correct endpoint (HttpTestingController); verify returns the parsed status
- [x] 5.2 GREEN — add the three methods to `AuthService`; remove `register` and `loginWithEmail`
- [x] 5.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-5.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 6. Frontend email-code UI + login page + remove old components

### Contract
- **Spec**: The system SHALL render a standalone Angular email-code login flow reachable from `/login`, presenting an email step, a code step, and (only for new emails) a name step, using Angular Material and the existing login design system; on final authentication call `loadCurrentUser()` and navigate to `/portal/dashboard`. // MODIFIED `client-login-page`: `/login` presents two auth options — Google sign-in and a "Sign in with email →" control entering the email-code flow; no `/register` route. // Invalid code → inline error banner with `data-testid="login-error"`.
- **Runtime**: `cd frontend && npx ng test --include='**/login*.spec.ts' --no-watch` → expected: email step calls request-code and advances; code step `authenticated` → navigates `/portal/dashboard`; `signup_required` → name step; name step calls complete-signup then navigates; 401 shows `data-testid="login-error"`; `/login` shows Google link + email-code control; `/register` and `/login/email` routes removed.
- **Code**: D6 — replace `RegisterComponent` + `LoginEmailComponent` with the multi-step email-code component; update `LoginComponent` (Google + email-code, drop "Create an account" + password "Sign in with email"); remove `/register` and `/login/email` routes. Follow existing Material design system (dot-grid bg, sky-blue accent stripe, GWH brand block). Reuse `AuthService` methods from group 5.
- **Threshold**: 80

- [x] 6.0 CONTRACT — write openspec/changes/email-otp-auth/contracts/group-6.md with the ### Contract block above
- [x] 6.1 RED — Invoke superpowers:test-driven-development. Failing component spec for the email-code component: email step → request-code + advance to code step
- [x] 6.2 GREEN — implement email step (email form, calls `requestEmailCode`, advances)
- [x] 6.3 RED — failing spec: code step with `authenticated` → `loadCurrentUser()` + navigate `/portal/dashboard`; with `signup_required` → advance to name step; 401 → `data-testid="login-error"` banner
- [x] 6.4 GREEN — implement code step (calls `verifyEmailCode`, branches, error banner)
- [x] 6.5 RED — failing spec: name step submit → `completeEmailSignup` then `loadCurrentUser()` + navigate `/portal/dashboard`
- [x] 6.6 GREEN — implement name step
- [x] 6.7 RED — failing `LoginComponent` spec: renders Google link + "Sign in with email →" control entering the email-code flow; no register link
- [x] 6.8 GREEN — update `LoginComponent`; delete `RegisterComponent` + `LoginEmailComponent`; remove `/register` and `/login/email` routes; fix router references
- [x] 6.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-6.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 7. Verification + E2E + ship

- [x] 7.1 Add a committed Playwright E2E in `e2e/` covering new-user signup (email → code → name → portal) and returning-user login (email → code → portal); read the code from the dev mail/log sink the flow uses in test
- [x] 7.2 Run backend test suite — `cd backend && ./mvnw test` — ensure no regressions
- [x] 7.3 Run frontend test suite — `cd frontend && npx ng test --no-watch` — ensure no regressions
- [x] 7.4 Run e2e suite — `cd e2e && npx playwright test` (backend + frontend must be running) — ensure new + returning login flows pass
- [x] 7.5 Run superpowers:verification-before-completion (run the three suites above; `grep -rn "console.log" frontend/src`; confirm no `password_hash` / `register` / `loginWithEmail` references remain)
