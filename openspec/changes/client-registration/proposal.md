## Why

The app currently has no way for clients to create an account or sign in with email and password — only Google OAuth is wired up. Adding email/password registration and login broadens access for clients who prefer not to use Google.

## What Changes

- Add `/login` page with three auth options: Google OAuth, Register, and Email/password login
- Add `/register` page with a full registration form (Name, Email, Password, Confirm Password) backed by `POST /api/auth/register`
- Add `/login/email` page with an email/password login form backed by `POST /api/auth/login`
- Replace the navbar "Client Login" MatMenu popover with a direct `routerLink="/login"` navigation
- Two Flyway migrations: make `google_sub` nullable, add `password_hash` column to `users`
- Remove `ClientPortalLoginComponent` (old popover)

## Capabilities

### New Capabilities
- `client-registration`: Email/password account registration — `POST /api/auth/register`, `RegisterComponent`, `/register` route
- `email-password-auth`: Email/password login — `POST /api/auth/login`, `LoginEmailComponent`, `/login/email` route
- `client-login-page`: Dedicated `/login` hub page (`LoginComponent`) presenting all three auth options

### Modified Capabilities
- `landing-page-navbar`: "Client Login" button changes from MatMenu popover trigger to `routerLink="/login"` direct navigation
- `google-oauth2-auth`: `users.google_sub` becomes nullable; `User` entity updated accordingly

## Impact

- **Backend**: new `AuthController`, two Flyway migrations (`V2`, `V3`), `User` entity field changes, `BCryptPasswordEncoder` bean
- **Frontend**: three new standalone components, updated `app.routes.ts`, `NavbarComponent` simplified (MatMenu removed)
- **Database**: `users.google_sub` nullable, `users.password_hash` added
- **Security config**: `POST /api/auth/register` and `POST /api/auth/login` permitted without authentication
- **Brainstorming spec**: `docs/superpowers/specs/2026-05-06-client-registration-design.md`

## Non-Goals

- Password reset / forgot password
- Email verification on registration
- "Remember me" / extended session persistence
- Social login providers other than Google
