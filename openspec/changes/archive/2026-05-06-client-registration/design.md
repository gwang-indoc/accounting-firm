## Context

The app currently only supports Google OAuth2 login. The `users` table enforces `google_sub NOT NULL`, which prevents creating email/password accounts. The navbar "Client Login" opens a MatMenu popover rather than navigating to a dedicated page.

This change adds email/password registration and login alongside Google OAuth, removes the popover, and introduces a dedicated `/login` hub page.

**Reference:** `docs/superpowers/specs/2026-05-06-client-registration-design.md`

## Goals / Non-Goals

**Goals:**
- Dedicated `/login` page replacing the navbar MatMenu popover
- Email/password registration via `POST /api/auth/register`
- Email/password login via `POST /api/auth/login` issuing the same JWT cookie as Google OAuth
- Angular Material UI throughout (mat-card, mat-form-field, mat-button, mat-divider, mat-error)

**Non-Goals:**
- Password reset / forgot password
- Email verification on registration
- "Remember me" / extended session persistence
- Social login providers other than Google

## Decisions

### 1. Registration issues no JWT — user must log in separately

**Decision:** `POST /api/auth/register` returns 201 with no JWT cookie. The user is redirected to `/login` with `?registered=true` to trigger a success snackbar, then logs in normally.

**Alternative considered:** Issue JWT immediately on registration (register = auto-login). Rejected because it conflates two concerns and makes the register flow harder to test in isolation.

### 2. `google_sub` made nullable rather than separate table

**Decision:** Alter the existing `users` table to make `google_sub` nullable and add `password_hash`. No separate `credentials` table.

**Alternative considered:** Separate `email_credentials` table for password-based auth. Rejected — unnecessary complexity for a single-tenant accounting portal with two auth paths. The application layer enforces mutual exclusivity.

### 3. Reuse existing `JwtService` for email/password login

**Decision:** `AuthController.login()` calls `JwtService.generateToken(user)` and sets the cookie directly, mirroring `OAuth2SuccessHandler`. No new JWT infrastructure.

**Alternative considered:** Spring Security `UsernamePasswordAuthenticationFilter`. Rejected — the existing httpOnly cookie pattern does not fit the standard filter chain; reusing `JwtService` keeps parity with OAuth2 path.

### 4. Frontend uses reactive forms (not template-driven)

**Decision:** `RegisterComponent` and `LoginEmailComponent` use `ReactiveFormsModule` with `FormGroup` / `FormControl`. Custom `passwordMatch` validator on the form group.

**Alternative considered:** Template-driven forms. Rejected — reactive forms are easier to unit-test with Vitest and give synchronous access to validation state without ViewChild.

### 5. `ClientPortalLoginComponent` removed entirely

**Decision:** Delete the existing MatMenu-based component and the `<mat-menu>` from `NavbarComponent`. Desktop "Client Login" becomes `<a mat-button routerLink="/login">`. Mobile sidenav item gets `routerLink="/login"`.

**Alternative considered:** Keep MatMenu, add `/login` as a menu item. Rejected — the MatMenu pattern from the navbar spec (`landing-page-navbar`) is superseded by the dedicated page. Keeping both would create two paths to login.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Flyway migration makes `google_sub` nullable — existing rows unaffected but schema change requires care | Migration is additive (DROP NOT NULL); no data moved. Run on a dev DB before prod deploy. |
| Existing Google OAuth users could theoretically be looked up by email during password login | `POST /api/auth/login` checks `passwordHash IS NOT NULL` before attempting BCrypt match → returns 401 if null (Google-only account) |
| `@DataJpaTest` uses local PostgreSQL (no Testcontainers per CLAUDE.md) | Tests must run against `localhost:5432`; CI must have a live PG instance |

## Migration Plan

1. Deploy backend with `V2__make_google_sub_nullable.sql` and `V3__add_password_hash.sql` — Flyway auto-runs on startup
2. Existing Google OAuth users unaffected (`password_hash = NULL`, `google_sub` still set)
3. New email/password users get `google_sub = NULL`, `password_hash` set
4. Frontend deployed simultaneously — navbar popover replaced with link
5. Rollback: drop `password_hash` column, re-add `NOT NULL` on `google_sub` (requires all email/password users to be deleted first — acceptable in early stage)

## Open Questions

- None — all decisions made during brainstorming session 2026-05-06.
