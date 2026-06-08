## 1. Database migration

### Contract
- **Spec**: `clients.email` SHALL be NOT NULL and globally UNIQUE across all client records. Every client record SHALL have a non-null `admin_id` referencing the `users` table. The database SHALL reject inserts without `admin_id` (NOT NULL violation). The database SHALL reject two client records sharing the same email (UNIQUE violation). After migration, no row in `users` SHALL have a null `name`.
- **Runtime**: `cd backend && ./mvnw test -Dtest=ClientRepositoryTest,UserRepositoryTest` → expected: all constraint tests pass; migration applies cleanly on a fresh schema
- **Code**: Single migration file `V8__add_client_admin_ownership.sql`; order is: DELETE clients, ADD admin_id NOT NULL, ALTER email NOT NULL + UNIQUE, backfill users.name, ALTER users.name NOT NULL. No rollback path — roll forward only.
- **Threshold**: 80

- [x] 1.0 CONTRACT — write openspec/changes/add-client-email-lookup/contracts/group-1.md with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [x] 1.1 RED — write `ClientRepositoryTest`: assert that inserting a client without `admin_id` throws a constraint violation; assert that inserting two clients with the same email throws a unique constraint violation; assert that inserting a client without email throws a NOT NULL violation
- [x] 1.2 GREEN — write `V12__add_client_admin_ownership.sql`: DELETE client_documents; DELETE clients; ADD COLUMN admin_id BIGINT NOT NULL REFERENCES users(id); ALTER email SET NOT NULL; ADD CONSTRAINT clients_email_unique UNIQUE(email); UPDATE users SET name = split_part(email,'@',1) WHERE name IS NULL; ALTER users.name SET NOT NULL. Update `Client` entity: add `adminId` field, mark `email` @Column(nullable=false, unique=true)
- [x] 1.3 RED — write `UserRepositoryTest`: assert that inserting a user with null name is rejected after migration
- [x] 1.4 GREEN — update `User` entity: annotate `name` with `@Column(nullable = false)`
- [x] 1.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-1.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 2. OAuth2 name fallback

### Contract
- **Spec**: OAuth2 login with a Google account that provides no `name` attribute SHALL result in a user record with name set to the email prefix (not null). `users.name` SHALL be NOT NULL.
- **Runtime**: `cd backend && ./mvnw test -Dtest=OAuth2SuccessHandlerTest` → expected: test for null-name path passes; user saved with email-prefix name
- **Code**: In `OAuth2SuccessHandler.onAuthenticationSuccess()`, if `oauthUser.getAttribute("name")` returns null, fall back to `email.substring(0, email.indexOf('@'))`. Email is always non-null from Google OAuth.
- **Threshold**: 80

- [x] 2.0 CONTRACT — write openspec/changes/add-client-email-lookup/contracts/group-2.md with the ### Contract block above
- [x] 2.1 RED — write `OAuth2SuccessHandlerTest`: mock an OAuth2User where `getAttribute("name")` returns null and `getAttribute("email")` returns `"test@example.com"`; assert the saved user has `name = "test"`
- [x] 2.2 GREEN — update `OAuth2SuccessHandler`: `String name = oauthUser.getAttribute("name"); if (name == null) name = email.substring(0, email.indexOf('@'));`
- [x] 2.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-2.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 3. User email lookup endpoint

### Contract
- **Spec**: The system SHALL provide `GET /api/admin/users/lookup?email=` returning `{ "name": "..." }` on match (200), 404 if not found, 403 if non-admin, 400 if email param missing.
- **Runtime**: `cd backend && ./mvnw test -Dtest=UserLookupControllerTest` → expected: all 4 scenario tests pass
- **Code**: New `UserLookupController` under `com.gwhaitech.accountingfirm.auth.controller`; uses `UserRepository.findByEmail()`; returns only `{ name }` — no other user fields. Secured by existing admin role check pattern on `/api/admin/**`.
- **Threshold**: 80

- [x] 3.0 CONTRACT — write openspec/changes/add-client-email-lookup/contracts/group-3.md with the ### Contract block above
- [x] 3.1 RED — write `UserLookupControllerTest` (@WebMvcTest): test 200 with name on match; 404 on no match; 403 for non-admin; 400 for missing param
- [x] 3.2 GREEN — create `UserLookupController` with `GET /api/admin/users/lookup?email=`; create `UserNameDto record(String name)`; inject `UserRepository`; call `findByEmail()` → 200/404; Spring Security handles 403
- [x] 3.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-3.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 4. Client management access control

### Contract
- **Spec**: `POST /api/clients` SHALL set `admin_id` from authenticated user; SHALL return 400 if email not in users; SHALL return 409 if email already in clients. `GET /api/clients` SHALL return only the admin's own clients. `GET /api/clients/{id}` SHALL return 403 if client is owned by a different admin. `admin_id` is set server-side — never from request body.
- **Runtime**: `cd backend && ./mvnw test -Dtest=ClientControllerTest,ClientServiceTest` → expected: ownership scoping, duplicate email, and unregistered email tests all pass
- **Code**: `admin_id` resolved from JWT principal in `ClientController`, passed to `ClientService.createClient()`. `ClientService.createClient()` calls `UserRepository.findByEmail()` (400 if absent) and `ClientRepository.findByEmailIgnoreCaseOrderById()` (409 if non-empty) before persisting. All list/get queries filter by `adminId`. `CreateClientRequest` adds `@NotBlank email` field.
- **Threshold**: 80

- [x] 4.0 CONTRACT — write openspec/changes/add-client-email-lookup/contracts/group-4.md with the ### Contract block above
- [x] 4.1 RED — write `ClientServiceTest`: assert createClient returns 400-equivalent when email not in users; assert 409-equivalent when email already in clients; assert admin_id is set from caller param
- [x] 4.2 GREEN — update `ClientService.createClient()`: accept `adminId` param; call `userRepository.findByEmail(email).orElseThrow(→ 400)`; call `clientRepository.findByEmailIgnoreCaseOrderById(email)` → if non-empty throw 409; set `client.setAdminId(adminId)`
- [x] 4.3 RED — write `ClientControllerTest`: assert GET /api/clients returns only caller's clients; assert GET /api/clients/{id} returns 403 for another admin's client
- [x] 4.4 GREEN — update `ClientController`: extract admin ID from `Authentication` principal; pass to service; filter list/get by adminId; return 403 on ownership mismatch
- [x] 4.5 — update `CreateClientRequest`: make `email` `@NotBlank`. Update `ClientDto` to include `adminId`. Update `ClientService.toDto()`.
- [x] 4.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-4.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 5. Frontend — email lookup, hint, auto-fill, validation

### Contract
- **Spec**: Typing a valid email matching a user SHALL auto-fill the name field and show "Registered user: [name]" hint; allow submission. Typing a valid email with no match SHALL show "Email not registered" error and block submission. Typing a valid email already in clients SHALL show "Client already exists" error and block submission. Typing an invalid format SHALL make no API call. Submit SHALL be disabled during debounce.
- **Runtime**: `cd frontend && npx ng test --no-watch --include='**/admin-client-dialog.component.spec.ts'` → expected: all async-validator and hint/auto-fill tests pass
- **Code**: Async validator in `admin-clients.service.ts` (or a dedicated validator): debounce 400 ms, two sequential calls (lookup → client-exists check). On match: patch name control + emit hint. On 404: set `notRegistered` error. On 409: set `duplicateClient` error. Form invalid while validator pending → submit disabled.
- **Threshold**: 80

- [x] 5.0 CONTRACT — write openspec/changes/add-client-email-lookup/contracts/group-5.md with the ### Contract block above
- [x] 5.1 RED — add `admin-client-dialog.component.spec.ts` tests: mock lookup service returning match → assert name field auto-filled, hint shown, no error; mock 404 → assert `notRegistered` error shown; mock 409 → assert `duplicateClient` error shown; mock invalid format → assert no service call made
- [x] 5.2 GREEN — add `lookupUserByEmail(email)` to `admin-clients.service.ts` (GET /api/admin/users/lookup?email=); add async validator to email control in `admin-client-dialog.component.ts` with 400 ms debounce; on match patch name control and set hint signal; on error set appropriate control error
- [x] 5.3 — update dialog template: add `mat-hint` below email field bound to hint signal; add `mat-error` for `notRegistered` and `duplicateClient` errors; ensure submit button disabled while form invalid or pending
- [x] 5.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-5.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 6. Verification + ship

- [x] 6.1 Run full backend test suite — `cd backend && ./mvnw test` — no regressions
- [x] 6.2 Run full frontend test suite — `cd frontend && npx ng test --no-watch` — no regressions
- [x] 6.3 Run e2e suite — `cd e2e && npx playwright test` — existing flows unbroken
- [x] 6.4 Run superpowers:verification-before-completion
