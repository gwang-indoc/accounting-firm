## Why

The project has a `pom.xml` with all required dependencies but no source code, no frontend, and no database migrations. We need to lay down the foundational skeleton — backend package structure, Angular frontend, Flyway-managed schema, and a working Google OAuth2 + JWT auth flow — so that all future feature work has a consistent, tested base to build on.

> Brainstorming spec: [`docs/superpowers/specs/2026-05-04-basic-project-structure-design.md`](../../../../docs/superpowers/specs/2026-05-04-basic-project-structure-design.md)

## What Changes

- **Backend**: Create `AccountingFirmApplication.java`, layered package structure (`config/`, `auth/`, `common/`), Spring Security config wired to Google OAuth2, JWT service, JWT cookie filter, OAuth2 success handler, and `AuthController` (`/api/auth/me`, `/api/auth/logout`)
- **Database**: First Flyway migration `V1__create_users.sql` — `users` table with `id`, `email`, `name`, `google_sub`, `role`, `created_at`
- **Configuration**: `application.yml` (env-var-driven datasource, JWT secret, OAuth2 client registration) and `application-dev.yml` (local Postgres URL, CORS for Angular dev server, cookie secure=false)
- **Frontend**: Generate Angular 21 project with standalone components; wire `HttpClient` with a global `withCredentials` interceptor; implement `AuthService` (signals), `AuthGuard`, home landing page with navbar, and `ClientPortalLoginComponent` (B2 dropdown popover); implement portal dashboard placeholder
- **pom.xml**: Fix `groupId` from `com.indocsystems` to `com.gwhaitech`

## Capabilities

### New Capabilities

- `google-oauth2-auth`: Google OAuth2 login flow with JWT issued as httpOnly cookie; includes `JwtService`, `JwtAuthFilter`, `OAuth2SuccessHandler`, `User` entity, and `/api/auth/me` + `/api/auth/logout` endpoints
- `client-portal-ui`: Angular landing page with persistent navbar "Client Login" button that opens a B2 dropdown popover containing "Sign in with Google"; post-login dashboard placeholder at `/portal/dashboard`

### Modified Capabilities

*(none — greenfield)*

## Impact

- **Backend**: All new files under `backend/src/main/java/com/gwhaitech/accountingfirm/`
- **Database**: New `users` table via Flyway; requires local PostgreSQL running with `accounting_firm` database
- **Frontend**: New `frontend/` directory (Angular CLI generated); dev proxy `/api/**` → `localhost:8080`
- **Dependencies**: Adds `jjwt` (JWT library) to `pom.xml`; Angular project brings its own `package.json`
- **Environment**: Requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `SPRING_DATASOURCE_*` env vars

## Non-Goals (Out of Scope)

- No accounting domain entities (clients, invoices, etc.)
- No role-based access control beyond the `role` column scaffold
- No email/password login — Google OAuth2 only
- No refresh token rotation
- No production deployment configuration
