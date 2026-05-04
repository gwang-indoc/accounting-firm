## Context

> Primary input: [`docs/superpowers/specs/2026-05-04-basic-project-structure-design.md`](../../../../docs/superpowers/specs/2026-05-04-basic-project-structure-design.md)

The backend has a `pom.xml` with all required dependencies (Spring Boot 3.5, Spring Security, OAuth2 Client, JPA, PostgreSQL, Flyway) but zero source files. There is no frontend directory. This design covers the minimum structure to get a working OAuth2 login flow end-to-end.

## Goals / Non-Goals

**Goals:**
- Working Google OAuth2 login that issues a JWT as an httpOnly cookie
- Angular landing page with navbar "Client Login" button → B2 dropdown popover → OAuth2 redirect
- Authenticated `/portal/dashboard` route (guarded)
- Single Flyway migration creating the `users` table
- All secrets externalised to environment variables

**Non-Goals:**
- Role-based access control
- Accounting domain entities
- Refresh token rotation
- Production deployment config

## Decisions

### 1. JWT delivered as httpOnly cookie (not Authorization header)

**Chosen:** Spring sets `Set-Cookie: jwt=<token>; HttpOnly; SameSite=Strict` on the OAuth2 success redirect. Angular uses `withCredentials: true` globally; the browser sends the cookie automatically.

**Alternatives considered:**
- *localStorage + Authorization: Bearer header* — rejected: XSS risk; any injected script can read the token
- *JWT as URL query param* — rejected: token leaks into browser history and server access logs
- *BFF / server-side session* — rejected: overkill for a single-frontend app at this stage

### 2. JWT library: jjwt (io.jsonwebtoken)

**Chosen:** `jjwt-api` / `jjwt-impl` / `jjwt-jackson` added to `pom.xml`. Well-maintained, idiomatic Java JWT library with a fluent builder API.

**Alternative:** `spring-security-oauth2-resource-server` JWT support — rejected: designed for resource servers validating tokens from an external auth server, not for issuing our own tokens.

### 3. Angular standalone components + signals

**Chosen:** Angular 21 standalone components (no NgModules), signals for `AuthService` state (`currentUser`, `isAuthenticated`). Aligns with Angular 21 defaults and avoids boilerplate module declarations.

**Alternative:** NgModule-based architecture — rejected: deprecated direction in Angular, more boilerplate.

### 4. App initializer for auth bootstrap

**Chosen:** `APP_INITIALIZER` calls `AuthService.loadCurrentUser()` on startup. This means Angular always knows the auth state before rendering any route, preventing flash of unauthenticated content.

**Alternative:** Lazy load auth state on first guarded route — rejected: causes visible redirect flash on page refresh.

### 5. OAuth2 redirect URI points to backend

**Chosen:** Google redirects to `http://localhost:8080/login/oauth2/code/google` (Spring's default). Spring processes the callback, issues the JWT cookie, then redirects to `http://localhost:4200/portal/dashboard`.

**Alternative:** Frontend-initiated PKCE flow — rejected: requires exposing client secret handling on frontend or a more complex architecture. Spring's server-side flow is simpler and more secure.

## Risks / Trade-offs

- **SameSite=Strict breaks cross-origin flows** → The dev setup (Angular on :4200, Spring on :8080) uses a proxy (`/api/**` → `:8080`) to keep them same-origin from the browser's perspective. The Angular `proxy.conf.json` is required.
- **JWT expiry with no refresh** → Users must re-login after token expiry. Acceptable for now; refresh token rotation is a future change.
- **Cookie secure=false in dev** → `application-dev.yml` sets `cookie.secure=false` so the cookie works over HTTP locally. Production must set this to `true` behind HTTPS.
- **Google OAuth2 credentials required for any local test** → Developers must set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Integration tests that hit the OAuth2 flow must mock the OAuth2 principal.
