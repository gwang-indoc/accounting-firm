## 1. Backend Foundation

- [x] 1.1 Fix `groupId` in `backend/pom.xml` from `com.indocsystems` to `com.gwhaitech`
- [x] 1.2 Add `jjwt-api`, `jjwt-impl`, `jjwt-jackson` dependencies to `pom.xml`
- [x] 1.3 Create `backend/src/main/java/com/gwhaitech/accountingfirm/AccountingFirmApplication.java`
- [x] 1.4 Create `backend/src/main/resources/application.yml` with datasource (env vars), OAuth2 client registration, JWT config placeholders
- [x] 1.5 Create `backend/src/main/resources/application-dev.yml` with local Postgres URL, CORS origin `http://localhost:4200`, cookie secure=false
- [x] 1.6 Create Flyway migration `backend/src/main/resources/db/migration/V1__create_users.sql` with the `users` table
- [x] 1.7 RED — write `@DataJpaTest` that tries to load the `User` entity and fails (class not found)
- [x] 1.8 GREEN — create `User.java` entity (`com.gwhaitech.accountingfirm.auth.domain`) mapped to `users` table; test passes
- [x] 1.9 Create `UserRepository.java` with `findByGoogleSub(String googleSub)` and `findByEmail(String email)`
- [ ] 1.Z Run superpowers:requesting-code-review on the diff for group 1; address CRITICAL/HIGH findings before moving on

## 2. JWT Service & Filter

- [ ] 2.1 Create `JwtConfig.java` (`com.gwhaitech.accountingfirm.config`) — binds `app.jwt.secret` and `app.jwt.expiration-ms` from `application.yml`
- [ ] 2.2 RED — write unit test for `JwtService`: `issueToken(user)` produces a parseable JWT; `validateToken(token)` returns claims; expired token throws
- [ ] 2.3 GREEN — create `JwtService.java` (`com.gwhaitech.accountingfirm.auth.service`) using `jjwt`; all tests pass
- [ ] 2.4 RED — write `@WebMvcTest` for `JwtAuthFilter`: request with valid cookie sets principal; request without cookie returns 401 on a protected endpoint
- [ ] 2.5 GREEN — create `JwtAuthFilter.java` (`com.gwhaitech.accountingfirm.auth.filter`) reading the `jwt` cookie, validating via `JwtService`, setting `SecurityContextHolder`; tests pass
- [ ] 2.Z Run superpowers:requesting-code-review on the diff for group 2; address CRITICAL/HIGH findings before moving on

## 3. OAuth2 Success Handler & Auth Controller

- [ ] 3.1 RED — write integration test for `OAuth2SuccessHandler`: mock OAuth2 principal with `google_sub` + `email` + `name`; first call creates user row; second call with same `google_sub` updates name; both calls set a `jwt` cookie on the response
- [ ] 3.2 GREEN — create `OAuth2SuccessHandler.java` (`com.gwhaitech.accountingfirm.auth.handler`): find-or-create user by `google_sub`, call `JwtService.issueToken`, set httpOnly cookie, redirect to `http://localhost:4200/portal/dashboard`; tests pass
- [ ] 3.3 Create `UserDto.java` (`com.gwhaitech.accountingfirm.common.dto`) with fields `id`, `email`, `name`, `role`
- [ ] 3.4 RED — write `@WebMvcTest` for `AuthController`: authenticated request to `GET /api/auth/me` returns 200 with `UserDto`; unauthenticated returns 401; `POST /api/auth/logout` clears cookie
- [ ] 3.5 GREEN — create `AuthController.java` (`com.gwhaitech.accountingfirm.auth.controller`); tests pass
- [ ] 3.6 Create `CorsConfig.java` (`com.gwhaitech.accountingfirm.config`) — allow `http://localhost:4200`, expose cookies, `allowCredentials=true`
- [ ] 3.7 Create `SecurityConfig.java` (`com.gwhaitech.accountingfirm.config`) — wire OAuth2 login, `OAuth2SuccessHandler`, `JwtAuthFilter`, permit `/api/auth/**` publicly, require auth for all other `/api/**`
- [ ] 3.Z Run superpowers:requesting-code-review on the diff for group 3; address CRITICAL/HIGH findings before moving on

## 4. Angular Project Setup

- [ ] 4.1 Scaffold Angular project: `cd accounting-firm && npx @angular/cli@21 new frontend --standalone --routing --style=css --skip-git`
- [ ] 4.2 Add `proxy.conf.json` at `frontend/proxy.conf.json`: proxy `/api/**` to `http://localhost:8080`
- [ ] 4.3 Update `frontend/angular.json` to reference `proxy.conf.json` in the `serve` target
- [ ] 4.4 Set `environment.ts` `apiUrl` to `http://localhost:8080` and `environment.prod.ts` accordingly
- [ ] 4.5 RED — write Jasmine test for `CredentialsInterceptor`: verify every outgoing request has `withCredentials: true`
- [ ] 4.6 GREEN — create `frontend/src/app/core/interceptors/credentials.interceptor.ts`; wire it in `app.config.ts` via `provideHttpClient(withInterceptors([credentialsInterceptor]))`; test passes
- [ ] 4.Z Run superpowers:requesting-code-review on the diff for group 4; address CRITICAL/HIGH findings before moving on

## 5. Auth Service & Guard

- [ ] 5.1 RED — write Jasmine test for `AuthService`: `loadCurrentUser()` on 200 sets `currentUser` signal and `isAuthenticated` returns true; on 401 sets null and `isAuthenticated` returns false
- [ ] 5.2 GREEN — create `frontend/src/app/core/services/auth.service.ts` with `currentUser = signal<UserDto | null>(null)`, `isAuthenticated = computed(...)`, `loadCurrentUser()`; tests pass
- [ ] 5.3 Register `APP_INITIALIZER` in `app.config.ts` calling `authService.loadCurrentUser()`
- [ ] 5.4 RED — write Jasmine test for `AuthGuard`: unauthenticated user is redirected to `/`; authenticated user passes through
- [ ] 5.5 GREEN — create `frontend/src/app/core/guards/auth.guard.ts`; tests pass
- [ ] 5.6 Wire routes in `app.routes.ts`: `''` → `HomeComponent` (lazy), `'portal/dashboard'` → `DashboardComponent` (lazy, canActivate: `[authGuard]`)
- [ ] 5.Z Run superpowers:requesting-code-review on the diff for group 5; address CRITICAL/HIGH findings before moving on

## 6. UI Components

- [ ] 6.1 Create `frontend/src/app/features/home/home.component.ts` and `home.component.html` — landing page with navbar and placeholder hero/services sections
- [ ] 6.2 RED — write Jasmine test for `ClientPortalLoginComponent`: dropdown hidden by default; clicking "Client Login" shows dropdown; clicking outside hides it; "Sign in with Google" link href is `/api/auth/login`
- [ ] 6.3 GREEN — create `frontend/src/app/features/client-portal/client-portal-login/client-portal-login.component.ts` and `.html` — B2 dropdown popover; tests pass
- [ ] 6.4 Wire `ClientPortalLoginComponent` into `HomeComponent` navbar (right side)
- [ ] 6.5 Create `frontend/src/app/features/client-portal/dashboard/dashboard.component.ts` and `.html` — displays `{{ authService.currentUser()?.name }}` and a logout button calling `POST /api/auth/logout`
- [ ] 6.Z Run superpowers:requesting-code-review on the diff for group 6; address CRITICAL/HIGH findings before moving on

## 7. E2E Verification

- [ ] 7.1 Automated E2E test via mcp__plugin_playwright_playwright__* tools:
  - Start backend: `cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
  - Start frontend: `cd frontend && npm start`
  - Navigate to `http://localhost:4200`
  - Assert navbar renders with "Client Login" button visible
  - Click "Client Login" — assert dropdown appears with "Sign in with Google"
  - Click outside dropdown — assert dropdown closes
  - (OAuth2 flow requires real Google credentials — verify redirect URL is correct: `http://localhost:8080/oauth2/authorization/google`)
- [ ] 7.2 Run superpowers:verification-before-completion (`cd backend && ./mvnw test`; `cd frontend && npx ng test --no-watch`; grep for `System.out.println` + `console.log`; diff review)
