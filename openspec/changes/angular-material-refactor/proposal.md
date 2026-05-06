## Why

The project's five Angular components each use hand-written, component-scoped CSS with hardcoded hex values and no shared design system. This creates inconsistent spacing, duplicated style rules, and no foundation for future UI growth. Adopting Angular Material establishes a single consistent design system backed by a custom theme.

## What Changes

- Install `@angular/material` 21 and `@angular/cdk`; wire `provideAnimationsAsync()` into `app.config.ts`.
- Define a custom Material theme in `styles.css` (sky-blue primary, dark navy toolbar surface, standard light page background).
- **NavbarComponent**: replace custom `<nav>` with `<mat-toolbar>`; nav links become `mat-button`; hamburger becomes `mat-icon-button`; Client Login dropdown becomes `MatMenu`; mobile drawer replaced by `MatSidenav` (mode `over`, position `start`) at app level in `app.html`.
- **ClientPortalLoginComponent**: replace custom dropdown div with `MatMenu` (desktop); removed from mobile drawer — sidenav renders the login card inline.
- **DashboardComponent**: replace custom header with `<mat-toolbar color="primary">`; logout becomes `mat-stroked-button`; welcome block becomes `<mat-card>`.
- **HomeComponent**: services section wrapped in `<mat-card>`; hero uses Material typography classes.
- **ContactComponent**: apply Material typography classes only (still a placeholder).
- Language toggle pills: unchanged — no Material equivalent.

## Capabilities

### New Capabilities

- `angular-material-theme`: Custom Angular Material 21 theme — installation, palette configuration, and global style baseline for the project.

### Modified Capabilities

- `landing-page-navbar`: NavbarComponent migrated to `MatToolbar` + `MatSidenav`; nav links become `mat-button`; Client Login becomes `MatMenu`; mobile drawer replaced by `MatSidenav`.
- `client-portal-ui`: `ClientPortalLoginComponent` desktop dropdown migrated to `MatMenu`; mobile login card rendered inline in sidenav (component no longer used in mobile drawer directly). `DashboardComponent` header migrated to `MatToolbar`; welcome block migrated to `MatCard`.

## Impact

- **Frontend only** — no backend, database, or API changes.
- **New dependency**: `@angular/material` 21, `@angular/cdk` 21.
- **All existing unit tests and E2E tests must remain green** — specs are updated to import Material test harness modules.
- **Brainstorming spec**: `docs/superpowers/specs/2026-05-06-angular-material-refactor-design.md`

## Non-Goals

- Adding new pages, routes, or features.
- Expanding placeholder page content.
- Replacing the language toggle pills.
- Any backend changes.
