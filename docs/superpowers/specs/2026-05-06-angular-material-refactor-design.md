# Angular Material Refactor — Design Spec

**Date:** 2026-05-06
**Scope:** Surface-only refactor — replace all custom CSS with Angular Material components on the five existing components. No new pages or features.

---

## Goals

- Replace handwritten CSS with Angular Material primitives throughout the app.
- Establish a single consistent design system backed by a custom Material theme.
- Keep the existing dark navy navbar visual identity; apply a standard Material light theme to all page content areas.
- No behaviour changes — routing, auth, language toggle logic, and Google OAuth2 flow are untouched.

## Non-Goals

- Adding new pages, routes, or features.
- Expanding placeholder page content (Home, Contact, Dashboard remain as-is structurally).
- Replacing the language toggle pills — no Material equivalent exists for this pattern; they stay as custom CSS.

---

## Decisions

### Theme approach
**Chosen:** Custom Material theme via `mat.define-theme()` in `styles.css`.

**Alternatives considered:**
- **Prebuilt theme only** (`@import '@angular/material/prebuilt-themes/indigo-pink.css'`) — fast to set up but no brand colour control; sky-blue accent and navy toolbar would require heavy overrides.
- **CSS custom properties only** — possible but bypasses the Material theming system entirely, making future upgrades harder.

The custom theme maps the project's two brand colours (sky-blue `#38bdf8` as primary, dark navy `#0f172a` as the toolbar surface) into Material's token system, so all components inherit brand colours without per-component overrides.

### Mobile navigation
**Chosen:** `MatSidenav` (mode `over`, position `start`) replacing the current `@if (menuOpen())` dropdown.

**Alternatives considered:**
- **Keep `@if` dropdown styled with `MatNavList`** — minimal code change but the dropdown-below-navbar pattern is not a standard Material navigation pattern and does not get Material animation or scrim behaviour.
- **`MatBottomSheet`** — used for action sheets, not navigation; wrong semantic.

`MatSidenav` at app level (`app.html`) slides in from the left over the page content with a dark scrim. The navbar hamburger button toggles it via a `MatSidenav` reference passed through a shared signal or `@ViewChild`. The `✕` close button appears in the toolbar when the sidenav is open.

### Client Login — desktop vs mobile
- **Desktop:** `MatMenu` triggered by a `mat-button` in the toolbar. Replaces the custom absolutely-positioned dropdown div.
- **Mobile (inside sidenav):** An inline expansion below the "Client Login" list item — a `MatExpansionPanel` or a simple `@if` block showing the Google sign-in card inline inside the sidenav panel. No secondary overlay is needed; the card expands in-place within the dark sidenav background.

---

## Component-by-Component Changes

### 1. Installation & Global Theme (`styles.css`, `app.config.ts`)

- Run `ng add @angular/material` — installs `@angular/material` 21 and `@angular/cdk`, adds `provideAnimationsAsync()` to `app.config.ts`.
- Define custom theme in `styles.css`:

```scss
@use '@angular/material' as mat;

$theme: mat.define-theme((
  color: (
    theme-type: light,
    primary: mat.$azure-palette,
  ),
));

html {
  @include mat.all-component-themes($theme);
}

// Dark toolbar override — apply dark navy to mat-toolbar[color="primary"]
.mat-toolbar.mat-primary {
  background: #0f172a;
  color: #ffffff;
}
```

- Page background: set `body { background: #f1f5f9; }` in `styles.css`.

---

### 2. NavbarComponent

**Template changes:**
- `<nav class="navbar">` → `<mat-toolbar color="primary">`
- Nav links → `<button mat-button>` / `<a mat-button>`
- "Book Consultation" CTA → `<a mat-flat-button>` (white background, dark text)
- Hamburger → `<button mat-icon-button (click)="sidenav.toggle()"><mat-icon>menu</mat-icon></button>` (mobile only, via `@media`)
- Client Login → `<button mat-button [matMenuTrigger]="loginMenu">` (desktop)
- Language pills — unchanged custom CSS

**CSS changes:**
- Remove all handwritten flexbox rules replaced by `MatToolbar`'s built-in layout.
- Retain: logo icon styles, brand text colours, tagline colour, language pill styles, `@media (max-width: 767px)` breakpoint hiding desktop links.

**MatSidenav wiring (`app.html`):**
```html
<mat-sidenav-container>
  <mat-sidenav #sidenav mode="over" position="start">
    <mat-nav-list>
      <a mat-list-item href="#services">Services</a>
      <a mat-list-item href="#security">Security</a>
      <!-- Client Login inline expansion -->
      <a mat-list-item (click)="loginOpen.update(v => !v)">Client Login</a>
      @if (loginOpen()) {
        <div class="sidenav-login-card">
          <p>Secure access to your accounting documents.</p>
          <a href="/oauth2/authorization/google" mat-flat-button color="primary">Sign in with Google</a>
          <p class="sidenav-security-label">🔒 Google OAuth2</p>
        </div>
      }
      <a mat-list-item routerLink="/contact">Contact</a>
      <a mat-list-item routerLink="/contact" class="sidenav-cta">Book Consultation</a>
    </mat-nav-list>
    <!-- language toggle -->
  </mat-sidenav>
  <mat-sidenav-content>
    <app-navbar [sidenav]="sidenav" />
    <router-outlet />
  </mat-sidenav-content>
</mat-sidenav-container>
```

`NavbarComponent` receives the `MatSidenav` reference as an `@Input()` and calls `sidenav.toggle()` from the hamburger button.

---

### 3. ClientPortalLoginComponent

**Desktop:**
- `<button mat-button [matMenuTrigger]="loginMenu">Client Login</button>`
- `<mat-menu #loginMenu>` wraps the portal description, Google sign-in link (`<a mat-menu-item>`), and security label.
- Remove: `.login-container`, `.login-dropdown`, `.login-btn`, `.google-signin-btn`, `.security-label` CSS.
- Retain: `:host(.drawer-item)` rule is removed — the component is no longer rendered in the mobile drawer directly (the sidenav owns the inline login card).

**Mobile:** handled inline in the sidenav (see NavbarComponent above). `ClientPortalLoginComponent` is not used in the mobile drawer.

---

### 4. DashboardComponent

- Header: `<mat-toolbar color="primary">` with title + `<button mat-stroked-button (click)="logout()">Logout</button>` (white stroked style on dark toolbar).
- Welcome block: `<mat-card><mat-card-header>` showing name and email.
- Remove: `.dashboard`, `.dashboard-header`, `.logout-btn`, `.dashboard-content` CSS.

---

### 5. HomeComponent

- Hero section: Material typography classes (`class="mat-headline-4"`, `class="mat-body-1"`). No wrapper component.
- Services section: `<mat-card><mat-card-title>Our Services</mat-card-title><mat-card-content>…</mat-card-content></mat-card>`.
- Remove: `.hero`, `.services` padding rules (replaced by Material card spacing).
- Retain: `main { margin-top: 68px; padding: 40px 24px; }` — needed to clear the fixed toolbar.

---

### 6. ContactComponent

- Apply Material typography classes to `<h1>` and `<p>`.
- No structural changes — still a placeholder.
- Remove: `h1 { margin-bottom: 1rem; }` (Material typography handles spacing).

---

## Testing

Each component change follows TDD:
- **Unit tests (Vitest + Angular TestBed):** update existing specs to import Material modules in the test harness; confirm rendered Material elements (`mat-toolbar`, `mat-card`, `mat-button`) are present.
- **E2E (Playwright):** update `e2e/navbar.spec.ts` — sidenav open/close replaces the `@if` drawer assertions; Client Login MatMenu open/close; CTA and contact link navigation unchanged.
- All 30 existing unit tests and 11 E2E tests must remain green after each task group.

---

## Mockups

Visual companion mockups saved to `.superpowers/brainstorm/` (gitignored):
- `design-overview.html` — desktop before/after for all four components
- `mobile-sidenav.html` — three mobile states: closed, sidenav open, Client Login expanded
