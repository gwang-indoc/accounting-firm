# Client Registration & Login Design

**Date:** 2026-05-06

## Overview

Add a dedicated `/login` page reachable from the navbar "Client Login" button. The page presents three auth options: Google OAuth, new account registration, and email/password login. Registration and email login each navigate to their own dedicated pages backed by new Spring Boot endpoints.

---

## 1. Routes & Components

| Route | Component | Purpose |
|---|---|---|
| `/login` | `LoginComponent` | Hub: Google OAuth · Register · Email login |
| `/register` | `RegisterComponent` | New account form |
| `/login/email` | `LoginEmailComponent` | Email/password login form |

- `ClientPortalLoginComponent` (the old MatMenu popover) is removed.
- All three routes are standalone components registered in `app.routes.ts`.
- `AuthGuard` does **not** protect these routes — they must be accessible without a session.

---

## 2. UI — Angular Material Components

### `/login` — `LoginComponent`

Single centered `mat-card` (Layout A — stacked):

```
┌─────────────────────────┐
│      Client Portal      │
│  Sign in to your acct   │
│                         │
│  [G  Sign in with Google] │  ← mat-flat-button (Google blue)
│         ── or ──        │  ← mat-divider
│  [  Register New Account ]  │  ← mat-stroked-button → /register
│         ── or ──        │  ← mat-divider
│   Sign in with Email →  │  ← mat-button (link style) → /login/email
└─────────────────────────┘
```

- Google button: `<a mat-flat-button href="/oauth2/authorization/google">`
- Register button: `routerLink="/register"`
- Email link: `routerLink="/login/email"`
- Mobile: card fills screen width; navbar shows hamburger.

### `/register` — `RegisterComponent`

`mat-card` with reactive form (`FormGroup`):

| Field | Validator |
|---|---|
| Full Name | `Validators.required` |
| Email | `Validators.required`, `Validators.email` |
| Password | `Validators.required`, `Validators.minLength(8)` |
| Confirm Password | `Validators.required`, custom `passwordMatch` validator |

- Submit: `mat-flat-button` "Create Account"
- Duplicate email (409 from backend): `mat-error` below email field
- Password mismatch: `mat-error` below confirm field
- On 201 success: navigate to `/login` with a query param `?registered=true` so `LoginComponent` can show a success `mat-snack-bar`.
- "← Back to Login" `mat-button` link at bottom.

### `/login/email` — `LoginEmailComponent`

`mat-card` with reactive form:

| Field | Validator |
|---|---|
| Email | `Validators.required`, `Validators.email` |
| Password | `Validators.required` |

- Submit: `mat-flat-button` "Sign In"
- 401 from backend: `mat-error` shown inline ("Invalid email or password")
- On success: JWT cookie is set by backend; Angular navigates to `/portal`.
- "← Back to Login" `mat-button` link at bottom.

---

## 3. Backend Changes

### Database migrations

**`V2__make_google_sub_nullable.sql`**
```sql
ALTER TABLE users ALTER COLUMN google_sub DROP NOT NULL;
```

**`V3__add_password_hash.sql`**
```sql
ALTER TABLE users ADD COLUMN password_hash VARCHAR(60);
```

`googleSub` and `passwordHash` are mutually exclusive in practice (a user registers via Google OR email/password) but both are nullable to allow the schema to stay simple. No enforcement constraint — application layer handles it.

### `User` entity updates

- `googleSub`: `@Column(nullable = true)`
- `passwordHash`: new `@Column(name = "password_hash", nullable = true)` field, `String`

### `POST /api/auth/register`

- **Request**: `RegisterRequest { fullName, email, password, confirmPassword }`
- **Validation** (in `AuthService`):
  - `password.equals(confirmPassword)` → 400 if not
  - `password.length() >= 8` → 400 if not
  - Email unique → 409 if duplicate (`DataIntegrityViolationException` caught)
- **Processing**: BCrypt-encode password → save `User(googleSub=null, passwordHash=hash)`
- **Response**: `201 Created` (no body, no JWT — user must log in separately)
- **Spring Security**: `permitAll()` on `POST /api/auth/register`

### `POST /api/auth/login`

- **Request**: `LoginRequest { email, password }`
- **Processing**:
  1. Look up user by email → 401 if not found
  2. `passwordEncoder.matches(password, user.passwordHash)` → 401 if false
  3. Generate JWT (same logic as `OAuth2SuccessHandler`)
  4. Set `httpOnly`, `SameSite=Strict` cookie on response
- **Response**: `200 OK` (cookie set, empty body)
- **Spring Security**: `permitAll()` on `POST /api/auth/login`

### `JwtService`

`JwtService` already exists at `auth/service/JwtService.java`. `AuthController` will inject it directly to generate and set the JWT cookie — no refactoring needed.

---

## 4. Navbar Changes

### Desktop

Replace the `matMenuTriggerFor` trigger on the "Client Login" button:

```html
<!-- before -->
<button mat-button [matMenuTriggerFor]="loginMenu">Client Login</button>

<!-- after -->
<a mat-button routerLink="/login">Client Login</a>
```

Remove `<mat-menu #loginMenu>` and its contents entirely from `navbar.component.html`.

### Mobile sidenav

Update the existing `mat-list-item` for Client Login:

```html
<mat-list-item routerLink="/login" (click)="sidenav.close()">Client Login</mat-list-item>
```

---

## 5. Error Handling

| Scenario | Frontend behaviour |
|---|---|
| Duplicate email (register) | `mat-error` under email field |
| Passwords don't match | `mat-error` under confirm field (client-side) |
| Password too short | `mat-error` under password field (client-side) |
| Wrong email/password (login) | `mat-error` shown inline |
| Network error | Generic `mat-snack-bar` "Something went wrong" |
| Successful registration | Navigate to `/login?registered=true` → snackbar |

---

## 6. Testing

### Backend

- `@WebMvcTest(AuthController)`:
  - `POST /api/auth/register` → 201 happy path
  - `POST /api/auth/register` → 400 (passwords don't match)
  - `POST /api/auth/register` → 400 (password too short)
  - `POST /api/auth/register` → 409 (duplicate email)
  - `POST /api/auth/login` → 200 (cookie set)
  - `POST /api/auth/login` → 401 (bad credentials)
- `@DataJpaTest`: unique email constraint on `UserRepository`

### Frontend (Vitest + Angular TestBed)

- `LoginComponent`: renders three sections, buttons navigate to correct routes
- `RegisterComponent`: form validation, duplicate email error display, success navigation
- `LoginEmailComponent`: form validation, 401 error display, success navigation

### E2E (Playwright)

- Full register flow: fill form → submit → redirected to `/login` with success snackbar
- Duplicate email: register same email twice → error shown
- Full email login flow: register → log in with email/password → land on `/portal`
- Navbar "Client Login" navigates to `/login` (desktop + mobile)

---

## 7. Out of Scope

- Password reset / forgot password
- Email verification on registration
- "Remember me" / session persistence beyond JWT expiry
- Social login providers other than Google
