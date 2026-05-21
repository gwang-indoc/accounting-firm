# Email/Password Authentication

> Sources: Project OpenSpec, 2026-05-21
> Raw: [openspec-email-password-auth](../../raw/authentication/openspec-email-password-auth.md); [openspec-client-registration](../../raw/authentication/openspec-client-registration.md)

## Overview

The system supports a self-service email/password auth path alongside Google OAuth2. Registration creates a user with a BCrypt-hashed password and `google_sub = NULL`. Login issues the same `httpOnly` JWT cookie as the OAuth2 path. Both endpoints are publicly accessible (Spring Security permits without JWT).

## Registration — POST /api/auth/register

Accepts: `fullName`, `email`, `password`, `confirmPassword`.

| Condition | Response |
|---|---|
| All valid (password ≥ 8 chars, passwords match, email unique) | 201 — user row created, no JWT issued |
| Passwords don't match | 400 |
| Password < 8 chars | 400 |
| Email already in `users` table | 409 |

No JWT is issued on registration — the user must subsequently log in.

## Login — POST /api/auth/login

Accepts: `email`, `password`.

| Condition | Response |
|---|---|
| Valid credentials | 200 — `httpOnly SameSite=Strict` JWT cookie set |
| Unknown email | 401 |
| Wrong password | 401 |
| Google-only account (`password_hash IS NULL`) | 401 |

## Frontend — RegisterComponent (/register)

Reactive `FormGroup`. Uses Angular Material (`mat-card`, `mat-form-field appearance="outline"`, `mat-flat-button`). Tree-shakeable individual imports.

Fields: Full Name, Email, Password, Confirm Password.

- Client-side: password mismatch shows `mat-error` "Passwords do not match" without sending a request.
- Server 409: shows `mat-error` "Email already registered" under Email field.
- Server 201: navigates to `/login?registered=true`.

Design follows the [Auth Pages design system](../frontend/auth-pages.md): dot-grid `#f1f5f9` background, centered mat-card (max-width 420px), sky-blue gradient top accent, navy 税 brand block, "NEW ACCOUNT" eyebrow.

## Frontend — LoginEmailComponent (/login/email)

Fields: Email, Password. Same design system as register (max-width 400px, "EMAIL SIGN IN" eyebrow).

- Backend 401: shows inline error banner (`data-testid="login-error"`) with horizontal shake animation.
- Backend 200: navigates to `/portal/dashboard`.

## See Also

- [Google OAuth2 Authentication](google-oauth2.md)
- [Auth Pages](../frontend/auth-pages.md)
