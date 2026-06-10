# Google OAuth2 Authentication

> Sources: Project OpenSpec, 2026-05-21
> Raw: [openspec-google-oauth2-auth](../../raw/authentication/openspec-google-oauth2-auth.md)

## Overview

Google OAuth2 is the primary authentication path. Spring Security's built-in OAuth2 flow issues a signed JWT stored as an `httpOnly`, `SameSite=Strict` cookie inaccessible to JavaScript. The same cookie format is shared with the email/password login path, so downstream concerns are auth-method-agnostic.

## OAuth2 Flow

Entry point: `GET /oauth2/authorization/google` (Spring Security built-in — not a custom controller).

**First-time login:** Creates a `users` row with `google_sub`, `email`, `name`, `role = 'USER'`. `password_hash` is NULL. Issues JWT cookie and redirects to `/portal/dashboard`.

**Returning user:** Looks up by `google_sub`, updates `email` and `name` if changed. Issues JWT cookie and redirects.

`users.google_sub` is nullable to allow email/password-only accounts to coexist in the same table.

## JWT Cookie

Attributes: `HttpOnly`, `SameSite=Strict`, `Path=/`. JavaScript cannot read the value. All HTTP clients must send `withCredentials: true` to include the cookie automatically.

## Auth Endpoints

| Endpoint           | Method | Auth     | Purpose                                    |
| ------------------ | ------ | -------- | ------------------------------------------ |
| `/api/auth/me`     | GET    | Required | Returns `{ id, email, name, role }` or 401 |
| `/api/auth/logout` | POST   | Required | Sets cookie `Max-Age=0`, returns 200       |

## See Also

- [Email/Password Authentication](email-password-auth.md)
- [Client Portal Dashboard](../frontend/client-portal-dashboard.md)
