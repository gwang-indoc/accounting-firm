# Eval Log — email-otp-auth

<!-- Appended by evaluator subagent after each N.E EVAL run -->

- group: 1
  attempt: 1
  scores: {spec: 100, runtime: 100, code: 85}
  total: 97
  status: PASS
  findings:
    - "spec: All 7 SHALL statements satisfied. Table structure, column definitions, code generation (SecureRandom 6-digit zero-padded), hash storage (BCrypt via PasswordEncoder), 10-minute expiry, 5-attempt cap, and index all match spec."
    - "runtime: 12/12 tests pass (5 repository + 7 service). Code generation verified as 6-digit regex match. Hash verified not plaintext. Expiry verified within 9-11min window. Attempts increment on wrong code. Dead row (attempts>=5) rejected. No attempts made when row absent."
    - "code: Clean architecture (Entity/Repository/Service layers). Proper transactions, secure random generation, BCrypt matching. Tests use correct patterns (@DataJpaTest with real DB, @ExtendWith Mockito for service). Query correctly orders createdAt DESC for latest-first retrieval."
    - "code: Minor deduction: existsByEmailAndCreatedAtAfter and countByEmailAndCreatedAtAfter defined in repository but never called by service layer. These support rate-limiting (mentioned in spec title) but enforcement is deferred to caller. Acceptable as minimal implementation but represents a gap between design intent and execution. Redundant attempts default (entity + migration) is harmless."
  fix_tasks: []

- group: 2
  attempt: 1
  scores: {spec: 100, runtime: 100, code: 95}
  total: 99
  status: PASS
  findings:
    - "spec: All contract requirements met. POST /api/auth/email/request-code endpoint properly exposed and mapped. Accepts email with @NotBlank @Email validation. Returns uniform body {\"status\":\"code_sent\"} for both known and unknown emails (no enumeration). Endpoint publicly accessible via /api/auth/** permitAll in SecurityConfig. Cooldown check (60s) and hourly cap (5 codes) both enforced via repository queries before code generation. Rate-limit violations return 429 with no mail sent. Mail send failure returns 502 (uniform for known/unknown). Code generation and hash storage delegated to service (verified in group 1)."
    - "runtime: 5/5 tests pass (0 failures, 0 errors). All contract scenarios covered: (1) known email → 200 + mail sent, (2) unknown email → 200 same body + mail sent, (3) cooldown breach → 429 + no mail, (4) hourly cap breach → 429 + no mail, (5) mail failure → 502. Service mocking verifies rate-limit checks are called. Mail-send mocking verifies side effects. Security config permits /api/auth/**."
    - "code: Clean Spring architecture. Controller focuses on HTTP concerns (RequestCodeRequest DTO, status mapping, exception handling). Service handles business logic (rate-limit queries, code generation). Proper dependency injection. SimpleMailMessage construction clear and readable. RateLimitException properly caught and mapped to 429. Mail send wrapped in try-catch and mapped to 502. RequestCodeRequest uses record syntax with validation annotations. Tests use @WebMvcTest appropriately. Mocking is comprehensive (service, mail sender, test security config). Test assertions verify both HTTP status and side effects (verify calls). @PostMapping and @RequestBody annotations correct."
    - "code: Minor: ExceptionHandler for RateLimitException defined at line 54-57 but not invoked (explicit catch at line 36 handles it). Redundant but harmless; explicit catch is cleaner for this single endpoint. No production impact."
  fix_tasks: []

- group: 3
  attempt: 1
  scores: {spec: 100, runtime: 100, code: 95}
  total: 99
  status: PASS
  findings:
    - "spec: All contract SHALL statements satisfied. POST /api/auth/email/verify-code exposes endpoint accepting email + code. Branching logic correct: existing user → HTTP 200 + JWT cookie (same attributes as OAuth2) + linkIfPossible invoked; new email → HTTP 200 + signup token in body (no JWT cookie). Signup token format verified: signed JWT with purpose=signup claim, subject=verified email, 10-minute expiry. POST /api/auth/email/complete-signup exposes endpoint accepting signupToken + name. Validates token (checks purpose=signup), creates users row with verified email, given name, role=USER, no password. Issues JWT cookie using shared JwtCookieHelper. Invokes linkIfPossible. Blank name rejected with HTTP 400 via @NotBlank validation. Invalid token rejected with HTTP 401 on JwtException. Code marked consumed delegated to EmailLoginCodeService (called via verify() method). Single-use enforcement via users.email UNIQUE constraint."
    - "runtime: 11/11 tests pass (0 failures, 0 errors). All contract scenarios covered: (1) verify-code + existing user → 200 authenticated + cookie + link, (2) verify-code + new email → 200 signup_required + token + no cookie, (3) verify-code + wrong code → 401, (4–5) request-code known/unknown → 200 + mail, (6–7) cooldown/hourly cap → 429, (8) mail failure → 502, (9) complete-signup valid → 200 + cookie + link, (10) complete-signup blank name → 400, (11) complete-signup invalid token → 401. Assertions verify HTTP status, response body structure (status field, signupToken field), cookie presence/absence, and service method invocations (linkIfPossible)."
    - "code: Clean architecture aligned with design decisions D1 and D5. JwtCookieHelper successfully extracted and reused across three issuance sites: OAuth2SuccessHandler (line 260 in diff), AuthController (line 41), AuthEmailController (lines 88, 117). Cookie attributes identical (httpOnly=true, SameSite=Strict, path=/, secure from config). JwtService.issueSignupToken() creates signed JWT with purpose=signup, subject=email, 10min expiry. JwtService.validateSignupToken() validates token and checks purpose claim before returning email. CompleteSignupRequest uses @NotBlank on signupToken and name fields. All endpoints use @Valid on request body. Proper dependency injection of JwtService, JwtCookieHelper, UserClientLinkService. Records used for DTOs (RequestCodeRequest, VerifyCodeRequest, CompleteSignupRequest). Tests use @WebMvcTest with TestSecurityConfig disabling CSRF. Mock setup for JwtCookieHelper returns properly configured Cookie instances. Assertions check cookie headers and JSON response structure."
    - "code: Minor deduction: test title completeSignup_validTokenAndName_creates201AndSetsCookieAndLinks says '201' but endpoint correctly returns 200 (HTTP 200 OK per spec, not 201 Created). Title is misleading but implementation is correct. No functional impact."
  fix_tasks: []

- group: 4
  attempt: 1
  scores: {spec: 100, runtime: 100, code: 100}
  total: 100
  status: PASS
  findings:
    - "spec: All SHALL removals executed. POST /api/auth/register and POST /api/auth/login endpoints removed — confirmed 404 on direct HTTP requests. AuthService.java deleted from src/main. RegisterRequest and LoginRequest DTOs deleted. AuthServiceTest deleted. User entity passwordHash field removed entirely. V10__drop_password_hash.sql migration present with correct syntax (ALTER TABLE users DROP COLUMN IF EXISTS password_hash). No code paths in src/main read passwordHash via getter calls or direct field access. Existing users retain email column and can log in via OTP code flow — no data loss."
    - "runtime: AuthControllerTest 5/5 pass (authenticatedUser_getMe_returns200, unauthenticated_getMe_returns401, logout_clearsCookieAndReturns200, register_endpointRemoved_returns404, login_endpointRemoved_returns404). Full auth-related test suite 21/21 pass (AuthControllerTest, OAuth2SuccessHandlerTest, JwtAuthFilterTest, UserEntityTest, EmailLoginCodeServiceTest). ContactIntegrationTest errors pre-existing (verified on main branch). No regressions introduced by password_hash removal."
    - "code: Clean deletions — AuthService, LoginRequest, RegisterRequest, and AuthServiceTest all removed from filesystem. AuthController retains only /me and /logout endpoints. User entity clean (no passwordHash field, no orphaned getters/setters). Flyway migration V10 follows naming convention, placed after V9 in sequence. IF EXISTS clause in DROP is defensive. No dangling imports or references in remaining auth code."
  fix_tasks: []

- group: 5
  attempt: 1
  scores: {spec: 100, runtime: 100, code: 100}
  total: 100
  status: PASS
  findings:
    - "spec: All three required methods exist and call correct endpoints. requestEmailCode(email) POSTs to /api/auth/email/request-code with {email}. verifyEmailCode(email, code) POSTs to /api/auth/email/verify-code with {email, code} and resolves to VerifyEmailCodeResponse {status, signupToken?}. completeEmailSignup(signupToken, name) POSTs to /api/auth/email/complete-signup with {signupToken, name}. register() method not present. loginWithEmail() method not present. All methods properly return Promise for async consumption."
    - "runtime: 8/8 tests pass. All contract scenarios verified: loadCurrentUser authenticated (signal set, computed true), loadCurrentUser unauthenticated (signal null, computed false), requestEmailCode POSTs to correct endpoint with correct body, verifyEmailCode POSTs to correct endpoint with correct body, verifyEmailCode returns status when authenticated, verifyEmailCode returns status + signupToken when signup_required, completeEmailSignup POSTs to correct endpoint, register method undefined, loginWithEmail method undefined."
    - "code: Clean Angular service pattern. Reuses existing HttpClient with global CredentialsInterceptor (no redundant withCredentials configuration). Proper use of signal for currentUser and computed for isAuthenticated, unchanged from existing pattern. VerifyEmailCodeResponse interface correctly defines {status, signupToken?}. All methods use firstValueFrom() for promise-based consumption, consistent with loadCurrentUser(). Methods are focused (no extra logic), follow Angular 21 standalone patterns. No unused imports or dead code. Zoneless/signals architecture preserved."
  fix_tasks: []

- group: 6
  attempt: 1
  scores: {spec: 100, runtime: 100, code: 80}
  total: 96
  status: PASS
  findings:
    - "spec: All contract SHALL statements satisfied. LoginEmailCodeComponent is standalone, reachable from /login, presents three steps (email, code, name). Email step calls requestEmailCode and advances to code step. Code step branching correct: authenticated → loadCurrentUser() + navigate /portal/dashboard; signup_required → advance to name step. Name step calls completeEmailSignup + loadCurrentUser + navigate. Error display uses data-testid='login-error' with role='alert'. LoginComponent shows Google sign-in link (href=/oauth2/authorization/google) and includes app-login-email-code component. Routes: /register removed, /login/email removed, /login remains."
    - "runtime: 12/12 tests pass (2 test files, 0 failures). LoginEmailCodeComponent: 3 email-step tests (renders input, submits call, advances to code), 3 code-step tests (authenticated navigates, signup_required shows name, 401 shows error banner), 1 name-step test (complete signup flow). LoginComponent: 5 tests (Client Portal heading rendered, Google href correct, email-code component present, NO register link, NO /login/email link). All contract scenarios covered."
    - "code: Clean standalone component architecture. Proper signal-based state management (step, emailValue, codeValue, nameValue, error, signupToken, submitting). Three async submit handlers with try/catch and finally blocks. Correct async/await pattern with Promise consumption. AuthService method calls match spec exactly. Router navigation to /portal/dashboard. Error handling and submission state management clean. Tests properly mock dependencies and use fixture.whenStable() for async operations. LoginComponent minimal and focused (only imports LoginEmailCodeComponent)."
    - "code: Deduction (–20): HTML form inputs are raw <input> elements, not wrapped in Material form-field/matInput. Contract specifies 'using Angular Material' and design requires Material components (mat-form-field, matInput, mat-button). Input elements lack Material theming and form styling. No Angular Material error display or label integration. Workaround: inputs use data-testid and autocomplete attributes for UX, but stylistically inconsistent with Material design system used in LoginComponent CSS."
  fix_tasks:
    - "6.F1 FIX — Wrap email, code, and name inputs in mat-form-field + matInput Material components; add matInput directive to preserve functionality while following Material design system. Ensure autocomplete, data-testid, and placeholder attributes preserved."
