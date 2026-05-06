# Angular Material Refactor — Tasks

## 1. Install Angular Material & Define Theme

- [x] 1.1 RED — write failing test: `npx ng test --include='**/app.config.spec.ts'` asserts `provideAnimationsAsync` is in the providers array → confirm FAILURE; paste RED output into dev log
- [x] 1.2 Run `ng add @angular/material` in `frontend/` — select "Custom" theme, enable animations; verify `@angular/material` and `@angular/cdk` appear in `package.json`
- [x] 1.3 GREEN — add `provideAnimationsAsync()` to `app.config.ts` providers → `npx ng test --include='**/app.config.spec.ts'` → confirm PASS
- [ ] 1.4 RED — write failing E2E test in `e2e/material-theme.spec.ts`: assert `getComputedStyle(document.querySelector('body')).backgroundColor` equals `rgb(241, 245, 249)` → confirm FAILURE; paste RED output into dev log
- [x] 1.5 Define custom Material theme in `styles.css`: `mat.define-theme()` with `$azure-palette` primary, light type; `mat-toolbar.mat-primary { background: #0f172a; color: #fff }`; `body { background: #f1f5f9 }` → GREEN: `npx ng test --no-watch` all pass
- [x] 1.6 Run superpowers:requesting-code-review on the diff for group 1; address CRITICAL/HIGH findings before moving on
- [x] 1.7 Update `docs/log/2026-05-06.md` — commit hash, feature bullets, review findings, test count, TDD evidence (RED failure lines for new tests)

## 2. NavbarComponent → MatToolbar + MatMenu (desktop) [parallel]

- [x] 2.0 Invoke superpowers:subagent-driven-development to dispatch the [parallel] units in this group; one subagent owns one RED+GREEN pair end-to-end including self-review
- [x] 2.1 RED — update `navbar.component.spec.ts`: assert `mat-toolbar` is present and `mat-button` elements exist for nav links → `npx ng test --include='**/navbar.component.spec.ts'` → confirm FAILURE; paste RED output into dev log [parallel]
- [x] 2.2 GREEN — replace `<nav class="navbar">` with `<mat-toolbar color="primary">`; replace anchor/button nav links with `mat-button`; replace CTA `<a>` with `<a mat-flat-button>`; import `MatToolbar`, `MatButton` in `navbar.component.ts` → confirm PASS [parallel]
- [x] 2.3 RED — update `navbar.component.spec.ts`: assert `[matMenuTrigger]` attribute exists on Client Login button and `mat-menu` is in the template → confirm FAILURE; paste RED output into dev log [parallel]
- [x] 2.4 GREEN — replace `<app-client-portal-login />` (desktop) with `<button mat-button [matMenuTrigger]="loginMenu">Client Login</button>` + `<mat-menu #loginMenu>`; update `ClientPortalLoginComponent` to use `MatMenu` + `mat-menu-item`; import `MatMenu`, `MatMenuItem` → confirm PASS [parallel]
- [x] 2.5 Trim `navbar.component.css` and `client-portal-login.component.css` — remove all rules now handled by Material; retain: logo icon styles, brand text colours, tagline colour, language pill styles, `position: fixed` on `mat-toolbar` host, `@media (max-width: 767px)` breakpoint
- [x] 2.6 `npx ng test --no-watch` — all tests green
- [x] 2.7 Run superpowers:requesting-code-review on the diff for group 2; address CRITICAL/HIGH findings before moving on
- [x] 2.8 Update `docs/log/2026-05-06.md` — commit hash, feature bullets, review findings, test count, TDD evidence

## 3. MatSidenav mobile drawer

- [ ] 3.1 RED — update `navbar.component.spec.ts` (and/or add `app.component.spec.ts`): assert `mat-sidenav-container` and `mat-sidenav` are present in `app.html`; assert `NavbarComponent` accepts a `sidenav` `@Input()` → `npx ng test --no-watch` → confirm FAILURE; paste RED output into dev log
- [ ] 3.2 GREEN — add `MatSidenav`, `MatSidenavContainer`, `MatSidenavContent` to `app.html` wrapping `<router-outlet>`; add `MatNavList`, `MatListItem` for nav links inside sidenav; add `loginOpen = signal(false)` and inline Client Login expansion; pass `#sidenav` reference to `<app-navbar [sidenav]="sidenav" />`; update `NavbarComponent` to accept `sidenav: MatSidenav` as `@Input()` and call `sidenav.toggle()` from hamburger `mat-icon-button` → confirm PASS
- [ ] 3.3 Update `navbar.component.css`: hamburger `mat-icon-button` visible only at `max-width: 767px`; sidenav link styles (sky-blue Book Consultation, language toggle at bottom)
- [ ] 3.4 `npx ng test --no-watch` — all tests green
- [ ] 3.5 Run superpowers:requesting-code-review on the diff for group 3; address CRITICAL/HIGH findings before moving on
- [ ] 3.6 Update `docs/log/2026-05-06.md` — commit hash, feature bullets, review findings, test count, TDD evidence

## 4. DashboardComponent + HomeComponent + ContactComponent [parallel]

- [ ] 4.0 Invoke superpowers:subagent-driven-development to dispatch the [parallel] units in this group; one subagent owns one RED+GREEN pair end-to-end including self-review
- [ ] 4.1 RED — update `dashboard.component.spec.ts`: assert `mat-toolbar` and `mat-card` are present → confirm FAILURE; paste RED output into dev log [parallel]
- [ ] 4.2 GREEN — replace dashboard header with `<mat-toolbar color="primary">`; replace logout button with `<button mat-stroked-button (click)="logout()">Logout</button>`; wrap welcome block in `<mat-card><mat-card-header>`; import `MatToolbar`, `MatButton`, `MatCard`, `MatCardHeader`, `MatCardContent` → confirm PASS [parallel]
- [ ] 4.3 RED — update `home.component.spec.ts`: assert `mat-card` is present in the services section → confirm FAILURE; paste RED output into dev log [parallel]
- [ ] 4.4 GREEN — wrap services section in `<mat-card>`; apply Material typography classes (`mat-headline-4`, `mat-body-1`) to hero; import `MatCard`, `MatCardTitle`, `MatCardContent` → confirm PASS [parallel]
- [ ] 4.5 GREEN — update `contact.component.html`: apply `class="mat-headline-4"` to `<h1>` and `class="mat-body-1"` to `<p>`; remove `h1 { margin-bottom: 1rem }` from `contact.component.css` [parallel]
- [ ] 4.6 `npx ng test --no-watch` — all 30+ tests green
- [ ] 4.7 Run superpowers:requesting-code-review on the diff for group 4; address CRITICAL/HIGH findings before moving on
- [ ] 4.8 Update `docs/log/2026-05-06.md` — commit hash, feature bullets, review findings, test count, TDD evidence

## 5. E2E Tests, Verification & Cleanup

- [ ] 5.1 Update `e2e/navbar.spec.ts`: replace `@if` drawer assertions with MatSidenav open/close assertions; replace Client Login custom dropdown assertions with MatMenu open/close; confirm CTA and contact navigation assertions still pass
- [ ] 5.2 Write/update Playwright E2E tests covering the full Material refactor flow:
       - Desktop: toolbar renders, Client Login MatMenu opens/closes, Book Consultation navigates to /contact
       - Mobile (375px): hamburger opens sidenav with scrim, nav links visible, Client Login inline expansion, Book Consultation as list item, sidenav closes on scrim tap
       Run:
       1. `./start.sh`
       2. `cd frontend && npm start`
       3. `cd e2e && npx playwright test`
       4. `kill $(lsof -ti :4200)`
       5. `kill $(lsof -ti :8080)`
- [ ] 5.3 Run superpowers:verification-before-completion (`cd backend && ./mvnw test`; `cd frontend && npx ng test --no-watch`; grep for `System.out.println` + `console.log`; diff review)
- [ ] 5.4 Run superpowers:requesting-code-review on the diff for group 5; address CRITICAL/HIGH findings before moving on
- [ ] 5.5 Update `docs/log/2026-05-06.md` — final entry: commit hash, feature bullets, review findings, full test count, TDD evidence
