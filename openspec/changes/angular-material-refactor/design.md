## Context

The project currently has five Angular 21 standalone components — `NavbarComponent`, `ClientPortalLoginComponent`, `HomeComponent`, `DashboardComponent`, and `ContactComponent` — all using hand-written, component-scoped CSS with hardcoded hex values. There is no shared design system, no Material dependency, and no global theme. The result is duplicated style rules, inconsistent spacing, and a fragile basis for future UI growth.

This design covers the technical approach for a surface-only refactor: replacing custom CSS with Angular Material 21 components without changing any routing, authentication, or backend behaviour. Primary reference: `docs/superpowers/specs/2026-05-06-angular-material-refactor-design.md`.

## Goals / Non-Goals

**Goals:**
- Install `@angular/material` 21 and define a custom theme (sky-blue primary, dark navy toolbar, light page background).
- Replace all custom layout and interactive CSS with Material primitives on all five components.
- Replace the mobile `@if (menuOpen())` dropdown drawer with `MatSidenav`.
- Keep all 30 existing unit tests and 11 E2E tests green throughout.

**Non-Goals:**
- New pages, routes, or features.
- Expanding placeholder page content.
- Language toggle pills — no Material equivalent; stays custom CSS.
- Any backend, database, or API changes.

## Decisions

### D1 — Custom theme via `mat.define-theme()` rather than prebuilt theme

**Chosen:** Define a custom Material theme in `styles.css` using `mat.define-theme()` with `$azure-palette` as primary, then override `mat-toolbar[color="primary"]` to use `#0f172a` (dark navy).

**Alternatives considered:**
- **Prebuilt indigo-pink theme** — zero setup, but provides no brand colours. Sky-blue accent and navy toolbar would require extensive `::ng-deep` overrides, which are deprecated.
- **CSS custom properties only** — bypasses the Material theming system entirely; future Material version upgrades would not carry over.

The custom theme maps brand tokens into Material's system once; all components inherit the palette automatically.

---

### D2 — `MatSidenav` at app level for mobile navigation

**Chosen:** `MatSidenav` (mode `over`, position `start`) placed in `app.html` wrapping `<router-outlet>`. `NavbarComponent` receives the `MatSidenav` reference as an `@Input()` and calls `sidenav.toggle()` from the hamburger `mat-icon-button`.

**Alternatives considered:**
- **Keep `@if (menuOpen())` drawer styled with `MatNavList`** — minimal code change, but the dropdown-below-navbar pattern is not standard Material; no scrim, no animation, no keyboard trap.
- **`MatBottomSheet`** — designed for action sheets, not navigation; wrong semantic and UX pattern.
- **`MatDrawer` inside `NavbarComponent`** — would require `NavbarComponent` to own the full-page layout, creating an inappropriate structural responsibility for a shared nav component.

`MatSidenav` at app level is the standard Angular Material navigation pattern for mobile. The scrim, focus trap, and close-on-backdrop-click behaviours come for free.

---

### D3 — Client Login: `MatMenu` on desktop, inline `@if` expansion on mobile

**Chosen:** Desktop uses `MatMenu` triggered from a `mat-button` in the toolbar. Mobile renders the Google sign-in card inline inside the sidenav using a `loginOpen = signal(false)` toggle — no secondary overlay.

**Alternatives considered:**
- **`MatDialog` on mobile** — creates a floating modal over the sidenav scrim, which looks broken (two overlays stacked).
- **`MatMenu` inside sidenav** — `MatMenu` is designed for toolbars; it positions itself relative to the trigger and can overflow the sidenav panel boundaries.
- **Reuse `ClientPortalLoginComponent` inside sidenav** — possible, but the component currently uses absolute positioning for its dropdown, which conflicts with sidenav layout. Simpler to render the login card inline and remove the component from the mobile drawer entirely.

---

### D4 — Material module imports: per-component, not via a shared barrel

**Chosen:** Each standalone component imports only the Material modules it uses (e.g., `NavbarComponent` imports `MatToolbar`, `MatButton`, `MatIconButton`, `MatMenu`, `MatIcon`).

**Alternatives considered:**
- **Shared `MaterialModule` barrel** — common in older Angular projects but anti-pattern for standalone components; breaks tree-shaking and inflates bundle size.

Per-component imports are the Angular 21 idiomatic approach and keep bundles minimal.

## Risks / Trade-offs

- **`mat-toolbar` fixed positioning** — `MatToolbar` does not apply `position: fixed` by default. The existing `position: fixed; top: 0` CSS rule on `.navbar` must be carried forward manually on the host element or via a wrapper. → Keep `position: fixed` on the `mat-toolbar` host in `navbar.component.css`.

- **Angular Material 21 + zoneless change detection** — `@angular/material` 21 is fully compatible with `provideZonelessChangeDetection()` (Angular signals-based). No risk. → No action needed.

- **`::ng-deep` avoidance** — Some Material internal styles (e.g., toolbar button ripple colour) may require host-context CSS variables rather than `::ng-deep`. → Use CSS custom properties (`--mat-toolbar-state-layer-color`) where available; document any unavoidable `::ng-deep` with a comment.

- **Test harness updates** — Existing specs use plain `fixture.nativeElement.querySelector` which still works with Material components. However, Material-specific assertions (e.g., verifying a `mat-menu` is open) need `MatMenuHarness` from `@angular/material/testing`. → Update specs that test interactive Material behaviour to use Angular CDK `HarnessLoader`.

## Migration Plan

1. Install Material (`ng add @angular/material`) and define theme — no visible change yet.
2. Migrate components in dependency order: NavbarComponent + app.html (sidenav wiring) → ClientPortalLoginComponent → DashboardComponent → HomeComponent → ContactComponent.
3. After each component, run `npx ng test --no-watch` to confirm unit tests green.
4. After all components, run full E2E suite (`cd e2e && npx playwright test`).
5. No rollback strategy needed — all changes are frontend CSS/template; git revert is sufficient.

## Open Questions

None — all decisions resolved during brainstorming.
