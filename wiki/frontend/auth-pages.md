# Auth Pages Design System

> Sources: Project OpenSpec, 2026-05-21
> Raw: [openspec-client-login-page](../../raw/frontend/openspec-client-login-page.md); [openspec-email-password-auth](../../raw/authentication/openspec-email-password-auth.md); [openspec-client-registration](../../raw/authentication/openspec-client-registration.md)

## Overview

Three auth pages — Login (`/login`), Email Login (`/login/email`), and Register (`/register`) — share a unified design system. Each is a standalone Angular component using tree-shakeable Angular Material imports. All routes are publicly accessible (no AuthGuard).

## Shared Design System

- **Background:** `#f1f5f9` with a subtle dot-grid texture
- **Card:** Centered `mat-card`, max-width 400–420px, horizontally and vertically centered
- **Top accent:** 3px sky-blue gradient stripe pinned to card top edge (`#0ea5e9` → `#38bdf8` → `#7dd3fc`)
- **Brand block:** 42×42px dark rounded icon (background `#0f172a`, text `#38bdf8`) + "GWH Accounting" + tagline
- **Form fields:** `mat-form-field appearance="outline"`, full-width via CSS class (no inline `style`)

## Login Page (/login)

Eyebrow: "CLIENT PORTAL" (sky-blue, uppercase, tracked). `<h1>`: "Welcome back".

Contents:
1. Google Sign-In `<a>` (white bordered button, inline Google G SVG) → `/oauth2/authorization/google`
2. "or" custom divider (not `mat-divider`)
3. "Create an account" `mat-stroked-button` → `/register`
4. "Sign in with email →" `mat-button` → `/login/email`
5. Security note: lock SVG + "Your data is always encrypted in transit"

Query param `?registered=true` triggers `MatSnackBar` "Account created! Please sign in."

## Email Login Page (/login/email)

Eyebrow: "EMAIL SIGN IN". `<h1>`: "Welcome back". Subtitle: "Use your email and password".

Fields: Email, Password. Submit: `mat-flat-button color="primary"` (full-width, 46px).

**Error state:** When backend returns 401, an inline error banner appears (`data-testid="login-error"`) with red-tinted background (`rgba(239,68,68,0.06)`), red border, warning SVG, and a horizontal shake animation. Text: "Invalid email or password".

Success (200): navigates to `/portal/dashboard`.

"← Back to Login" `mat-button` → `/login`.

## Register Page (/register)

Eyebrow: "NEW ACCOUNT". `<h1>`: "Create Account". Subtitle: "Fill in your details below".

Fields: Full Name, Email, Password, Confirm Password. Submit: `mat-flat-button color="primary"` (full-width, 46px, 8px border-radius). Max-width: 420px.

- Password mismatch (client-side): `mat-error` "Passwords do not match" — no request sent.
- 409 (server): `mat-error` "Email already registered" under Email field.
- 201 (server): navigate to `/login?registered=true`.

"← Back to Login" `mat-button` → `/login`.

## See Also

- [Angular Material Theme](angular-material-theme.md)
- [Email/Password Authentication](../authentication/email-password-auth.md)
- [Navbar and Layout](navbar-and-layout.md)
