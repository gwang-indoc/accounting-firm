## MODIFIED Requirements

### Requirement: NavbarComponent renders full navigation bar

The system SHALL render a `NavbarComponent` (`<app-navbar />`) at the top of every page. The navbar SHALL use `<mat-toolbar color="primary">` with `position: fixed; top: 0; left: 0; right: 0; z-index: 100; height: 68px`. The toolbar background SHALL be `#0f172a` (dark navy) via the Material custom theme. Navigation links SHALL be `mat-button` elements with `color` defaulting to white. The "Book Consultation" CTA SHALL be an `<a mat-flat-button>` with `background: #fff; color: #0f172a`. The "Client Login" button SHALL be an `<a mat-button routerLink="/login">` — there is NO MatMenu popover.

#### Scenario: Navbar structure on desktop

- **WHEN** the viewport width is ≥ 768px
- **THEN** the navbar displays inside a `mat-toolbar`: logo section, `mat-button` nav links (Services · Security · Client Login · Contact), Book Consultation `mat-flat-button`, language toggle pills
- **THEN** the "Client Login" element is `<a mat-button routerLink="/login">` with NO `[matMenuTrigger]`
- **THEN** the "Book Consultation" renders as a white flat button with `color: #0f172a`
- **THEN** the navbar stays fixed at the top as the user scrolls

#### Scenario: Logo section

- **WHEN** the navbar renders
- **THEN** the logo section shows a 42×42px dark rounded icon containing "税", company name "GWH Accounting" in white bold, and tagline "Secure Tax & Accounting Portal" in `#38bdf8`

## REMOVED Requirements

### Requirement: Client Login inline expansion in sidenav
**Reason:** Replaced by direct navigation to `/login` page. The MatMenu popover pattern is removed entirely.
**Migration:** The "Client Login" sidenav item becomes a plain `mat-list-item` with `routerLink="/login"` that closes the sidenav on click.
