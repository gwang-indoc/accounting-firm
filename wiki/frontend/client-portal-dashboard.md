# Client Portal Dashboard

> Sources: Project OpenSpec, 2026-05-21
> Raw: [openspec-client-portal-ui](../../raw/frontend/openspec-client-portal-ui.md)

## Overview

The portal dashboard is a protected area requiring authentication. `AuthService` manages state via Angular signals, bootstrapped before first render via `APP_INITIALIZER`. `AuthGuard` redirects unauthenticated users to `/`. `DashboardComponent` at `/portal/dashboard` renders a hero greeting, account overview, quick actions, and messages.

## AuthService

Signals:
- `currentUser = signal<UserDto | null>(null)`
- `isAuthenticated = computed(() => currentUser() !== null)`

Initialization: `APP_INITIALIZER` calls `loadCurrentUser()` which calls `GET /api/auth/me`. Sets `currentUser` on success, leaves null on 401.

`logout()`: calls `POST /api/auth/logout` → sets `currentUser(null)`.

## AuthGuard

Protects `/portal/**`. Redirects unauthenticated users to `/` (the landing page). Authenticated users pass through.

## CredentialsInterceptor

Attaches `withCredentials: true` to every `HttpClient` request so the JWT cookie is sent automatically.

## Dev Proxy (proxy.conf.json)

All three path prefixes must be forwarded to `http://localhost:8080`:

| Prefix | Purpose |
|---|---|
| `/api` | REST API calls |
| `/oauth2` | OAuth2 authorization entry point |
| `/login/oauth2` | OAuth2 callback handler |

Omitting `/oauth2` breaks the login flow — the browser stays on `localhost:4200`.

## DashboardComponent Layout

**Hero greeting band** — full-width dark navy (`#0f172a`):
- Time-of-day label: "Good morning" / "Good afternoon" / "Good evening"
- User's name as large heading
- Current date
- No "Secure Session" badge, no secondary mat-toolbar

**Account Overview card** (full-width `mat-card`):
- `mat-card-title`: user's name
- `mat-card-subtitle`: user's email
- Two stats: Documents (future API) and Tax Year (hardcoded `2025`)
- No "Pending Review" stat

**Quick Actions card** (`mat-card`):
- Single "Upload Document" `mat-button` (full-width, text only, no icon)

**Messages card** (`mat-card`):
- Each row: sky-blue (`#38bdf8`) unread dot (hidden when read), bold title when unread, sender name, date
- Pill badge in card title showing unread count when `unreadCount > 0`
- Empty state when no messages exist
- Rows wired for future navigation to message detail view

## See Also

- [Google OAuth2 Authentication](../authentication/google-oauth2.md)
- [Navbar and Layout](navbar-and-layout.md)
- [Angular Material Theme](angular-material-theme.md)
