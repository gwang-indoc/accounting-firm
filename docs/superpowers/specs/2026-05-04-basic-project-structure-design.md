# Basic Project Structure Design

**Date:** 2026-05-04  
**Status:** Approved

## Overview

Bootstrap the foundational skeleton of the accounting firm web application — Spring Boot backend, Angular frontend, PostgreSQL database, and Google OAuth2 authentication with JWT (httpOnly cookie).

## Auth Flow

```
Angular                  Spring Backend              Google
  |                           |                        |
  |-- click "Client Login" -> |                        |
  |   (dropdown opens)        |                        |
  |-- GET /api/auth/login --> |                        |
  |                           |-- redirect to Google ->|
  |                           |<-- code callback ------|
  |                           |-- exchange code ------>|
  |                           |<-- user profile -------|
  |                           |-- find/create user     |
  |                           |-- issue JWT            |
  |                           |-- Set-Cookie: jwt=...  |
  |                           |   httpOnly, SameSite=Strict
  |<-- redirect to /portal/dashboard
  |                           |                        |
  |-- GET /api/auth/me ------>|  (cookie auto-sent)    |
  |<-- { id, email, name } ---|                        |
  |                           |                        |
  |-- GET /api/... ---------->|  (cookie auto-sent)    |
  |   withCredentials: true   |-- validate JWT         |
  |<-- 200 OK ----------------|                        |
```

**Key decisions:**
- JWT stored as `httpOnly, SameSite=Strict` cookie — never accessible to JavaScript (XSS-safe)
- Angular never manually manages the token; browser sends it automatically
- `withCredentials: true` applied globally via an Angular HTTP interceptor
- `/api/auth/me` bootstraps Angular auth state on app load (401 = unauthenticated)
- `/api/auth/logout` clears the cookie server-side

## Backend Structure

**Package root:** `com.gwhaitech.accountingfirm`

```
backend/src/main/java/com/gwhaitech/accountingfirm/
├── AccountingFirmApplication.java
├── config/
│   ├── SecurityConfig.java          # Spring Security + OAuth2 + JWT filter chain
│   ├── JwtConfig.java               # JWT secret and expiry from application.yml
│   └── CorsConfig.java              # CORS: allow Angular origin, withCredentials
├── auth/
│   ├── controller/
│   │   └── AuthController.java      # GET /api/auth/me, POST /api/auth/logout
│   ├── service/
│   │   └── JwtService.java          # issue(user) → JWT string, validate(token) → claims
│   ├── filter/
│   │   └── JwtAuthFilter.java       # reads jwt cookie, validates, sets SecurityContext
│   ├── handler/
│   │   └── OAuth2SuccessHandler.java # on OAuth2 success: find/create user, issue JWT, set cookie, redirect
│   └── domain/
│       └── User.java                # @Entity mapped to users table
└── common/
    └── dto/
        └── UserDto.java             # { id, email, name, role } — response for /api/auth/me
```

**Configuration files:**
- `application.yml` — datasource (env vars), jwt.secret (env var), jwt.expiration, OAuth2 client registration
- `application-dev.yml` — local PostgreSQL URL, CORS allowed origin `http://localhost:4200`, cookie secure=false

## Database

Single Flyway migration: `V1__create_users.sql`

```sql
CREATE TABLE users (
    id          BIGSERIAL    PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(255),
    google_sub  VARCHAR(255) NOT NULL UNIQUE,  -- Google's immutable account identifier
    role        VARCHAR(50)  NOT NULL DEFAULT 'USER',
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

`google_sub` is the stable `sub` field from Google's OAuth2 response. Used to look up users on login (email can change; `google_sub` never does). `OAuth2SuccessHandler` finds user by `google_sub`, updates email/name if changed, creates row if first login.

## Frontend Structure

**Angular 21, standalone components, signals for auth state.**

```
frontend/src/
├── environments/
│   ├── environment.ts               # apiUrl: 'http://localhost:8080'
│   └── environment.prod.ts
└── app/
    ├── app.config.ts                # provideHttpClient(withInterceptors([credentialsInterceptor])), provideRouter
    ├── app.routes.ts                # '/' → home, '/portal/dashboard' → guarded
    ├── core/
    │   ├── services/
    │   │   └── auth.service.ts      # currentUser signal, isAuthenticated computed, loadCurrentUser()
    │   ├── interceptors/
    │   │   └── credentials.interceptor.ts  # sets withCredentials: true on every HttpClient request
    │   └── guards/
    │       └── auth.guard.ts        # canActivate: redirect to '/' if !isAuthenticated
    └── features/
        ├── home/
        │   ├── home.component.ts
        │   └── home.component.html  # landing page: navbar + hero + services + footer
        └── client-portal/
            ├── client-portal-login/
            │   ├── client-portal-login.component.ts   # dropdown popover, triggered from navbar
            │   └── client-portal-login.component.html # "Sign in with Google" button
            └── dashboard/
                ├── dashboard.component.ts
                └── dashboard.component.html           # post-login placeholder, shows user name
```

## UI Layout

**Navbar (always visible):**
- Left: firm name/logo
- Right: "Client Login" button

**"Client Login" click behaviour (B2 — dropdown popover):**
- A light card drops down directly below the navbar button
- Contains: portal title, brief description, "Sign in with Google" button, "Secured by Google OAuth2" label
- Clicking outside dismisses the dropdown
- Clicking "Sign in with Google" triggers `GET /api/auth/login` → OAuth2 redirect

**Post-login:**
- Spring sets JWT cookie, redirects to `http://localhost:4200/portal/dashboard`
- Angular bootstraps `AuthService.loadCurrentUser()` via app initializer
- Dashboard shows user name from `currentUser()` signal

## Angular Auth State

```typescript
// auth.service.ts
currentUser = signal<UserDto | null>(null);
isAuthenticated = computed(() => this.currentUser() !== null);

loadCurrentUser(): Observable<void> {
  return this.http.get<UserDto>('/api/auth/me').pipe(
    tap(user => this.currentUser.set(user)),
    catchError(() => { this.currentUser.set(null); return EMPTY; })
  );
}
```

## Alternatives Considered

| Approach | Rejected because |
|---|---|
| JWT in `localStorage` + `Authorization: Bearer` header | XSS risk; token accessible to any JS on page |
| JWT as URL query param | Token leaks into browser history and server logs |
| BFF pattern with server-side sessions | Significantly more complexity for no benefit at this stage |
| Separate `/login` route | User requested login inside the main page, not a separate page |
| Centered full-screen modal (B1) | User preferred the lighter dropdown popover (B2) |
| Slide-in drawer (B3) | User preferred dropdown (B2) |

## Non-Goals (Out of Scope)

- No role-based access control beyond the `role` column scaffold
- No accounting domain entities (clients, invoices, etc.) — that is a separate change
- No email/password login — Google OAuth2 only
- No refresh token rotation — single JWT with configurable expiry
- No production deployment config
