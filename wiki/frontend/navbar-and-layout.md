# Navbar and Layout

> Sources: Project OpenSpec, 2026-05-21
> Raw: [openspec-landing-page-navbar](../../raw/frontend/openspec-landing-page-navbar.md); [openspec-client-portal-ui](../../raw/frontend/openspec-client-portal-ui.md)

## Overview

`NavbarComponent` is a fixed-height toolbar that appears on every page. On desktop it shows inline nav links; on mobile it collapses to a hamburger that reveals a `MatSidenav` drawer. Auth state is reactive — the navbar swaps "Client Login" for user name + Logout when authenticated.

## Toolbar Structure

- Element: `<mat-toolbar color="primary">`
- Position: `fixed; top: 0; left: 0; right: 0; z-index: 100; height: 68px`
- Background: `#0f172a` (dark navy) via Material theme
- Content below navbar: `mat-sidenav-content` has `padding-top: 68px`

## Logo Block

42×42px dark rounded icon containing "税", "GWH Accounting" in white bold, "Secure Tax & Accounting Portal" in `#38bdf8`.

## Desktop Navigation (≥768px)

**Unauthenticated:** Services · Security · `Client Login` (routerLink="/login") · Contact + "Book Consultation" flat button + EN/中文 language toggle.

`Client Login` is `<a mat-button routerLink="/login" data-testid="client-login-btn">` — **no** `[matMenuTrigger]`.

"Book Consultation" is `<a mat-flat-button>` with `background: #fff; color: #0f172a`.

**Authenticated:** "Client Login" is replaced by the user's display name and a `Logout` `mat-button` (`data-testid="logout-btn"`).

## Mobile Navigation (MatSidenav)

`MatSidenav` is defined in `app.html` (mode: `over`, position: `start`), wrapping `<router-outlet>`. `NavbarComponent` receives the sidenav as `@Input()` and calls `sidenav.toggle()` on the hamburger button. Toolbar icon toggles between `menu` (☰) and `close` (✕).

Sidenav contains a `mat-nav-list` with `mat-list-item` entries: Services, Security, Client Login, Contact, Book Consultation (sky-blue `#38bdf8`), and the language toggle pills at the bottom.

**MDC caveat:** mat-list-item inherits light-theme text by default. The `.app-sidenav` host must set:
```css
--mat-list-list-item-label-text-color: #e2e8f0;
--mdc-list-list-item-label-text-color: #e2e8f0;
```

## Navigation Targets

| Link | Action |
|---|---|
| Services | Smooth-scroll to `#services` |
| Security | Smooth-scroll to `#security` |
| Contact | Router → `/contact` |
| Book Consultation | Router → `/contact` |
| Client Login | Router → `/login` |

## Language Toggle

EN/中文 pills. Default: EN active (sky-blue `#38bdf8` background). `NavbarComponent.lang()` signal returns `'en'` or `'zh'`.

## Logout Flow

Clicking Logout: calls `POST /api/auth/logout` → sets `AuthService.currentUser` to `null` → navigates to `/`. Navbar reactively reverts to unauthenticated state.

## See Also

- [Angular Material Theme](angular-material-theme.md)
- [Client Portal Dashboard](client-portal-dashboard.md)
- [Auth Pages](auth-pages.md)
