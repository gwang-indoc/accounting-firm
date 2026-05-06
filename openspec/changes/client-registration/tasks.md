# Client Registration & Login — Tasks

> **For agentic workers:** REQUIRED SKILLS before starting:
> 1. Invoke `superpowers:test-driven-development` — read it before writing any code
> 2. Invoke `superpowers:subagent-driven-development` — for dispatching [parallel] tasks
> 3. Invoke `superpowers:requesting-code-review` — at each N.Z checkpoint

**Spec:** `docs/superpowers/specs/2026-05-06-client-registration-design.md`
**Design:** `openspec/changes/client-registration/design.md`

---

## 1. Database & Entity

- [x] 1.1 Run `cd backend && ./mvnw test` — confirm green baseline before starting; paste test count to dev log
- [x] 1.2 Create `backend/src/main/resources/db/migration/V2__make_google_sub_nullable.sql`:
         ```sql
         ALTER TABLE users ALTER COLUMN google_sub DROP NOT NULL;
         ```
- [x] 1.3 Create `backend/src/main/resources/db/migration/V3__add_password_hash.sql`:
         ```sql
         ALTER TABLE users ADD COLUMN password_hash VARCHAR(60);
         ```
- [x] 1.4 RED — add test to `UserEntityTest`: save a `User` with `googleSub = null` and assert it persists without error.
         Run: `./mvnw test -Dtest=UserEntityTest` → confirm FAILURE (NOT NULL constraint violation).
         Paste key failure lines to dev log.
- [x] 1.5 GREEN — update `User` entity (`com.gwhaitech.accountingfirm.auth.domain.User`):
         - Change `@Column(name = "google_sub", nullable = false, unique = true)` → `nullable = true`
         - Add field: `@Column(name = "password_hash", nullable = true) private String passwordHash;` with getter/setter
         Run: `./mvnw test -Dtest=UserEntityTest` → confirm PASS → commit migrations + entity + test together
- [x] 1.6 Run `cd backend && ./mvnw test` — confirm all tests pass after entity change
- [x] 1.7 Run superpowers:requesting-code-review on the diff for group 1; address CRITICAL/HIGH findings before moving on
- [x] 1.8 Update `docs/log/2026-05-06.md` — add group 1 entry: commit hash, feature bullets, review findings, test count, TDD evidence (paste RED failure lines from 1.4)

## 2. Backend Registration Endpoint

- [x] 2.1 Run `cd backend && ./mvnw test` — confirm green baseline
- [x] 2.2 Create DTO `com.gwhaitech.accountingfirm.auth.dto.RegisterRequest`:
         ```java
         package com.gwhaitech.accountingfirm.auth.dto;
         import jakarta.validation.constraints.*;
         public record RegisterRequest(
             @NotBlank String fullName,
             @NotBlank @Email String email,
             @NotBlank @Size(min = 8) String password,
             @NotBlank String confirmPassword
         ) {}
         ```
- [x] 2.3 Create `com.gwhaitech.accountingfirm.auth.service.AuthService` (stub — just the class with `@Service`):
         ```java
         @Service
         public class AuthService {
             private final UserRepository userRepository;
             private final PasswordEncoder passwordEncoder;
             public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
                 this.userRepository = userRepository;
                 this.passwordEncoder = passwordEncoder;
             }
         }
         ```
- [x] 2.4 Add `BCryptPasswordEncoder` bean to `SecurityConfig`:
         ```java
         @Bean
         public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
         ```
- [x] 2.5 RED — add test to `AuthControllerTest`: `POST /api/auth/register` with valid JSON body `{"fullName":"Jane","email":"jane@test.com","password":"password123","confirmPassword":"password123"}` → expect 201.
         Run: `./mvnw test -Dtest=AuthControllerTest` → confirm FAILURE ("No mapping for POST").
         Paste key failure lines to dev log.
- [x] 2.6 GREEN — add `POST /api/auth/register` to `AuthController`, inject `AuthService`, implement `AuthService.register(RegisterRequest)`: validate passwords match, BCrypt-hash, save user (`googleSub=null, passwordHash=hash, role="USER"`), return 201. Run test → confirm PASS
- [x] 2.7 RED — add test to `AuthControllerTest`: passwords don't match → expect 400.
         Run test → confirm FAILURE. Paste failure lines to dev log.
- [x] 2.8 GREEN — throw `ResponseStatusException(BAD_REQUEST)` in `AuthService.register()` when passwords differ. Run test → confirm PASS
- [x] 2.9 RED — add test to `AuthControllerTest`: duplicate email → expect 409 (mock `UserRepository.save()` to throw `DataIntegrityViolationException`).
         Run test → confirm FAILURE. Paste failure lines to dev log.
- [x] 2.10 GREEN — add `@ExceptionHandler(DataIntegrityViolationException.class)` in `AuthController` returning 409. Run test → confirm PASS → commit all (DTOs + AuthService + AuthController additions + tests)
- [x] 2.11 Run `cd backend && ./mvnw test` — confirm all tests pass
- [x] 2.12 Run superpowers:requesting-code-review on the diff for group 2; address CRITICAL/HIGH findings before moving on
- [x] 2.13 Update `docs/log/2026-05-06.md` — add group 2 entry: commit hash, feature bullets, review findings, test count, TDD evidence (paste RED failure lines from 2.5, 2.7, 2.9)

## 3. Backend Login Endpoint

- [x] 3.1 Run `cd backend && ./mvnw test` — confirm green baseline
- [x] 3.2 Create DTO `com.gwhaitech.accountingfirm.auth.dto.LoginRequest`:
         ```java
         package com.gwhaitech.accountingfirm.auth.dto;
         import jakarta.validation.constraints.*;
         public record LoginRequest(
             @NotBlank @Email String email,
             @NotBlank String password
         ) {}
         ```
- [x] 3.3 RED — add test to `AuthControllerTest`: `POST /api/auth/login` with valid credentials → expect 200 and `Set-Cookie` header containing `jwt=`.
         Mock `AuthService.login()` to return a token string; mock `JwtService` as needed.
         Run: `./mvnw test -Dtest=AuthControllerTest` → confirm FAILURE ("No mapping for POST /api/auth/login").
         Paste failure lines to dev log.
- [x] 3.4 GREEN — add `POST /api/auth/login` to `AuthController` (inject `JwtService`, `@Value("${app.cookie.secure:true}")`, `@Value("${app.jwt.expiration-ms:86400000}")`).
         Implement `AuthService.login(LoginRequest)`:
         1. `userRepository.findByEmail(email)` → throw `ResponseStatusException(UNAUTHORIZED)` if empty
         2. `passwordEncoder.matches(password, user.getPasswordHash())` → throw `UNAUTHORIZED` if false
         3. Return the `User`
         In `AuthController.login()`: call `authService.login()`, call `jwtService.issueToken(user)`, build cookie identical to `OAuth2SuccessHandler` pattern, return 200.
         Run test → confirm PASS
- [x] 3.5 RED — add test: wrong password → expect 401. Run test → confirm FAILURE. Paste lines to dev log.
- [x] 3.6 GREEN — BCrypt mismatch already handled in step 3.4 `AuthService.login()`. Confirm test passes.
- [x] 3.7 RED — add test: unknown email → expect 401. Run test → confirm FAILURE. Paste lines to dev log.
- [x] 3.8 GREEN — unknown email already handled in step 3.4. Confirm test passes.
- [x] 3.9 Add `findByEmail(String email): Optional<User>` to `UserRepository` if not already present.
         Run `cd backend && ./mvnw test` → all passing → commit
- [x] 3.10 Run superpowers:requesting-code-review on the diff for group 3; address CRITICAL/HIGH findings before moving on
- [x] 3.11 Update `docs/log/2026-05-06.md` — add group 3 entry: commit hash, feature bullets, review findings, test count, TDD evidence (paste RED failure lines from 3.3, 3.5, 3.7)

## 4. Frontend Services & Routes

- [x] 4.0 Invoke superpowers:subagent-driven-development to dispatch the [parallel] units in this group; one subagent owns one RED+GREEN pair end-to-end including self-review.
- [x] 4.1 [parallel] Run `cd frontend && npx ng test --no-watch` — confirm green baseline
- [x] 4.2 [parallel] RED — add test to `navbar.component.spec.ts`: "Client Login" button has `routerLink="/login"` and no `[matMenuTriggerFor]` attribute.
         Run: `npx ng test --include='**/navbar.component.spec.ts' --no-watch` → confirm FAILURE.
         Paste failure lines to dev log.
- [x] 4.3 [parallel] GREEN — in `navbar.component.html`:
         Replace line 13 (`<button mat-button [matMenuTriggerFor]="loginMenu" data-testid="client-login-btn">Client Login</button>`) with:
         `<a mat-button routerLink="/login" data-testid="client-login-btn">Client Login</a>`
         Remove lines 14–24 (the entire `<mat-menu #loginMenu>` block).
         Update mobile sidenav "Client Login" `mat-list-item` to add `routerLink="/login" (click)="sidenav.close()"`.
         Remove any unused `MatMenuModule` import from `navbar.component.ts`.
         Run test → confirm PASS → commit
- [x] 4.4 [parallel] RED — add test to `auth.service.spec.ts`: `authService.register({...})` POSTs to `/api/auth/register` and returns `Observable<void>`.
         Run: `npx ng test --include='**/auth.service.spec.ts' --no-watch` → confirm FAILURE.
         Paste failure lines to dev log.
- [x] 4.5 [parallel] GREEN — add to `AuthService` (`src/app/core/services/auth.service.ts`):
         ```typescript
         register(dto: { fullName: string; email: string; password: string; confirmPassword: string }): Observable<void> {
           return this.http.post<void>('/api/auth/register', dto);
         }
         loginWithEmail(dto: { email: string; password: string }): Observable<void> {
           return this.http.post<void>('/api/auth/login', dto);
         }
         ```
         Run test → confirm PASS → commit
- [x] 4.6 Add routes to `app.routes.ts` — create stub component files first so routes compile:
         - Create `src/app/features/auth/login/login.component.ts` (stub — `@Component({ template: '<p>login</p>', standalone: true }) export class LoginComponent {}`)
         - Create `src/app/features/auth/register/register.component.ts` (stub)
         - Create `src/app/features/auth/login-email/login-email.component.ts` (stub)
         Add to `app.routes.ts`:
         ```typescript
         { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
         { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
         { path: 'login/email', loadComponent: () => import('./features/auth/login-email/login-email.component').then(m => m.LoginEmailComponent) },
         ```
- [x] 4.7 Run `cd frontend && npx ng test --no-watch` → all passing → commit
- [x] 4.8 Run superpowers:requesting-code-review on the diff for group 4; address CRITICAL/HIGH findings before moving on
- [x] 4.9 Update `docs/log/2026-05-06.md` — add group 4 entry: commit hash, feature bullets, review findings, test count, TDD evidence (paste RED failure lines from 4.2, 4.4)

## 5. Frontend Components

- [ ] 5.0 Invoke superpowers:subagent-driven-development to dispatch the [parallel] units in this group; one subagent owns one component (stub → full impl → tests) end-to-end including self-review. Units: LoginComponent (5.1–5.4), RegisterComponent (5.5–5.8), LoginEmailComponent (5.9–5.12).

**LoginComponent** (`src/app/features/auth/login/`)

- [ ] 5.1 [parallel] Replace stub `login.component.ts` + create `login.component.html` and `login.component.css`:
         **HTML** — single centered `mat-card` with `mat-card-header` title "Client Portal", subtitle "Sign in to access your account":
         - `<a mat-flat-button style="background:#4285f4;color:white" href="/oauth2/authorization/google">` with Google "G" icon span + "Sign in with Google"
         - `<mat-divider>` with "or" label
         - `<a mat-stroked-button routerLink="/register">Register New Account</a>`
         - `<mat-divider>` with "or" label
         - `<a mat-button routerLink="/login/email">Sign in with Email →</a>`
         **TS** — standalone, imports: `MatCardModule`, `MatButtonModule`, `MatDividerModule`, `MatSnackBarModule`, `RouterModule`. Inject `ActivatedRoute` and `MatSnackBar`. In `ngOnInit()`: if `route.snapshot.queryParamMap.get('registered') === 'true'`, call `snackBar.open('Account created! Please sign in.', 'OK', { duration: 4000 })`.
- [ ] 5.2 [parallel] RED — write `login.component.spec.ts`:
         (a) renders heading "Client Portal"
         (b) Google button has `href="/oauth2/authorization/google"`
         (c) Register button has `routerLink="/register"`
         (d) With `queryParams: { registered: 'true' }`, `MatSnackBar.open` is called with 'Account created! Please sign in.'
         Run: `npx ng test --include='**/login.component.spec.ts' --no-watch` → confirm FAILURE. Paste lines to dev log.
- [ ] 5.3 [parallel] GREEN — implement `LoginComponent.ngOnInit()` snackbar logic. Run test → confirm PASS → commit

**RegisterComponent** (`src/app/features/auth/register/`)

- [ ] 5.4 [parallel] Replace stub `register.component.ts` + create `register.component.html` and `register.component.css`:
         **HTML** — `mat-card` with title "Create Account", subtitle "Fill in your details below":
         - `mat-form-field` × 4: Full Name (`formControlName="fullName"`), Email (`formControlName="email"`), Password (`type="password"`, `formControlName="password"`), Confirm Password (`type="password"`, `formControlName="confirmPassword"`)
         - Each field has `<mat-error>` for required + format + custom errors
         - Email field: `<mat-error *ngIf="form.get('email')?.hasError('emailTaken')">Email already registered</mat-error>`
         - Confirm field: `<mat-error *ngIf="form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched">Passwords do not match</mat-error>`
         - `<button mat-flat-button type="submit">Create Account</button>`
         - `<a mat-button routerLink="/login">← Back to Login</a>`
         **TS** — standalone, reactive `FormGroup` with custom `passwordMatch` validator on group:
         ```typescript
         function passwordMatch(group: AbstractControl) {
           return group.get('password')?.value === group.get('confirmPassword')?.value
             ? null : { passwordMismatch: true };
         }
         ```
         On `submit()`: if form invalid return. Call `authService.register(form.value)`. On success: `router.navigate(['/login'], { queryParams: { registered: 'true' } })`. On 409 error: `form.get('email')?.setErrors({ emailTaken: true })`. Imports: `MatCardModule`, `MatFormFieldModule`, `MatInputModule`, `MatButtonModule`, `ReactiveFormsModule`, `RouterModule`.
- [ ] 5.5 [parallel] RED — write `register.component.spec.ts`:
         (a) `passwordMatch` validator returns `{ passwordMismatch: true }` when fields differ
         (b) `authService.register()` mock returning error 409 → email control has error `emailTaken`
         (c) `authService.register()` mock returning success → `router.navigate` called with `['/login', { queryParams: { registered: 'true' } }]`
         Run: `npx ng test --include='**/register.component.spec.ts' --no-watch` → confirm FAILURE. Paste lines to dev log.
- [ ] 5.6 [parallel] GREEN — implement full `RegisterComponent` submit logic. Run test → confirm PASS → commit

**LoginEmailComponent** (`src/app/features/auth/login-email/`)

- [ ] 5.7 [parallel] Replace stub `login-email.component.ts` + create `login-email.component.html` and `login-email.component.css`:
         **HTML** — `mat-card` with title "Sign In", subtitle "Use your email and password":
         - `mat-form-field` for Email (`formControlName="email"`, type="email")
         - `mat-form-field` for Password (`formControlName="password"`, type="password")
         - Inline error div: `<div *ngIf="loginError" class="login-error">Invalid email or password</div>`
         - `<button mat-flat-button type="submit">Sign In</button>`
         - `<a mat-button routerLink="/login">← Back to Login</a>`
         **TS** — standalone, reactive `FormGroup` with `email` (required, email) and `password` (required). Signal `loginError = signal(false)`. On `submit()`: reset `loginError`. Call `authService.loginWithEmail(form.value)`. On success: `router.navigate(['/portal'])`. On 401 error: `loginError.set(true)`. Imports: `MatCardModule`, `MatFormFieldModule`, `MatInputModule`, `MatButtonModule`, `ReactiveFormsModule`, `RouterModule`.
- [ ] 5.8 [parallel] RED — write `login-email.component.spec.ts`:
         (a) `authService.loginWithEmail()` mock returning 401 error → `loginError` signal is `true`, error div visible
         (b) `authService.loginWithEmail()` mock returning success → `router.navigate` called with `['/portal']`
         Run: `npx ng test --include='**/login-email.component.spec.ts' --no-watch` → confirm FAILURE. Paste lines to dev log.
- [ ] 5.9 [parallel] GREEN — implement full `LoginEmailComponent` submit logic. Run test → confirm PASS → commit

- [ ] 5.10 Run `cd frontend && npx ng test --no-watch` → all tests passing → commit if any uncommitted changes
- [ ] 5.11 Run superpowers:requesting-code-review on the diff for group 5; address CRITICAL/HIGH findings before moving on
- [ ] 5.12 Update `docs/log/2026-05-06.md` — add group 5 entry: commit hash, feature bullets, review findings, test count, TDD evidence (paste RED failure lines from 5.2, 5.5, 5.8)

## 6. E2E & Final Verification

- [ ] 6.1 Write Playwright E2E test `e2e/client-registration.spec.ts` covering:
         - Desktop: navbar "Client Login" (`[data-testid="client-login-btn"]`) click → URL is `/login`
         - Mobile (375px): hamburger → sidenav "Client Login" → URL is `/login`
         - `/login` page: three elements visible (Google button, Register button, Email link)
         - Register flow: navigate to `/register`, fill Name/Email/Password/Confirm → submit → URL is `/login` with success snackbar visible
         - Duplicate email: attempt to register same email a second time → `mat-error` on email field visible
         - Email login flow: navigate to `/login/email`, fill email + password → submit → URL is `/portal` (requires backend running with the registered user)
         Commit the file.
         Run:
         1. `./start.sh`                                                # start backend
         2. `cd frontend && npm start`                                  # start frontend
         3. `cd e2e && npx playwright test client-registration`         # run E2E suite
         4. `kill $(lsof -ti :4200)`                                    # stop frontend
         5. `kill $(lsof -ti :8080)`                                    # stop backend
- [ ] 6.2 Run superpowers:verification-before-completion:
         - `cd backend && ./mvnw test` — all passing
         - `cd frontend && npx ng test --no-watch` — all passing
         - `grep -r "System.out.println" backend/src/main/` — must find nothing
         - `grep -r "console.log" frontend/src/app/` — must find nothing
         - Review full diff: confirm no unintended changes
- [ ] 6.3 Run superpowers:requesting-code-review on the diff for group 6; address CRITICAL/HIGH findings before moving on
- [ ] 6.4 Update `docs/log/2026-05-06.md` — add group 6 entry: commit hash, feature bullets, review findings, E2E test count, any TDD evidence
