## Requirements

### Requirement: NavbarComponent renders full navigation bar

The system SHALL render a `NavbarComponent` (`<app-navbar />`) at the top of every page. The navbar SHALL use `<mat-toolbar color="primary">` with `position: fixed; top: 0; left: 0; right: 0; z-index: 100; height: 68px`. The toolbar background SHALL be `#0f172a` (dark navy) via the Material custom theme. Navigation links SHALL be `mat-button` elements with `color` defaulting to white. The "Book Consultation" CTA SHALL be an `<a mat-flat-button>` with `background: #fff; color: #0f172a`. The page content area (`mat-sidenav-content`) SHALL have `padding-top: 68px` so content is not obscured by the fixed navbar.

#### Scenario: Navbar structure on desktop (unauthenticated)

- **WHEN** the viewport width is ≥ 768px and the user is NOT authenticated
- **THEN** the navbar displays: logo section, `mat-button` nav links (Services · Security · Client Login · Contact), Book Consultation `mat-flat-button`, language toggle pills
- **THEN** the "Client Login" element is `<a mat-button routerLink="/login" data-testid="client-login-btn">` with NO `[matMenuTrigger]`
- **THEN** the "Book Consultation" renders as a white flat button with `color: #0f172a`
- **THEN** the navbar stays fixed at the top as the user scrolls

#### Scenario: Navbar structure on desktop (authenticated)

- **WHEN** the viewport width is ≥ 768px and the user IS authenticated
- **THEN** the "Client Login" link is replaced by the authenticated user's display name and a `Logout` `mat-button`
- **THEN** the Logout button has `data-testid="logout-btn"`

#### Scenario: Logo section

- **WHEN** the navbar renders
- **THEN** the logo section shows a 42×42px dark rounded icon containing "税", company name "GWH Accounting" in white bold, and tagline "Secure Tax & Accounting Portal" in `#38bdf8`

### Requirement: Navigation links scroll or route correctly

#### Scenario: Services link scrolls to services section
- **WHEN** the user clicks "Services"
- **THEN** the page smooth-scrolls to the element with `id="services"` on the landing page

#### Scenario: Security link scrolls to security section
- **WHEN** the user clicks "Security"
- **THEN** the page smooth-scrolls to the element with `id="security"` on the landing page

#### Scenario: Contact link navigates to /contact
- **WHEN** the user clicks "Contact"
- **THEN** the router navigates to `/contact`

#### Scenario: Book Consultation button navigates to /contact
- **WHEN** the user clicks "Book Consultation"
- **THEN** the router navigates to `/contact`

### Requirement: Language toggle switches between EN and 中文

#### Scenario: Default language is English
- **WHEN** the navbar first renders
- **THEN** the "EN" pill is active (sky-blue background `#38bdf8`) and "中文" is inactive

#### Scenario: Clicking 中文 activates Chinese
- **WHEN** the user clicks "中文"
- **THEN** the "中文" pill becomes active and "EN" becomes inactive
- **THEN** `NavbarComponent.lang()` returns `'zh'`

#### Scenario: Clicking EN restores English
- **WHEN** `lang()` is `'zh'` and the user clicks "EN"
- **THEN** `lang()` returns `'en'` and "EN" pill is active

### Requirement: Navbar collapses to hamburger menu on mobile using MatSidenav

The system SHALL collapse the navbar to a hamburger `mat-icon-button` on narrow screens. The mobile drawer SHALL be a `MatSidenav` (mode `over`, position `start`) defined in `app.html`, wrapping `<router-outlet>`. The sidenav SHALL slide in from the left with a dark scrim over the page content. `NavbarComponent` SHALL receive the `MatSidenav` instance as an `@Input()` and call `sidenav.toggle()` from the hamburger button.

#### Scenario: Hamburger icon toggles sidenav open and closed

- **WHEN** the sidenav is closed and the user taps the hamburger `mat-icon-button`
- **THEN** the sidenav opens, the scrim appears over page content, and the toolbar icon changes to `close` (✕)
- **WHEN** the user taps ✕ or the scrim
- **THEN** the sidenav closes and the icon returns to `menu` (☰)

#### Scenario: Sidenav navigation links

- **WHEN** the sidenav is open
- **THEN** a `mat-nav-list` is rendered with `mat-list-item` entries for: Services, Security, Client Login, Contact, Book Consultation
- **THEN** "Book Consultation" is a plain `mat-list-item` in sky-blue (`#38bdf8`) — not a full-width button
- **THEN** the language toggle pills appear at the bottom of the sidenav
- **THEN** the "Client Login" sidenav item is a plain `mat-list-item` with `routerLink="/login"` that closes the sidenav on click

### Requirement: Navbar logout button is visible when authenticated

The system SHALL replace the "Client Login" link with a user name label and a "Logout" `mat-button` whenever `AuthService.isAuthenticated()` is `true`. The change is reactive — clicking Logout immediately updates the navbar back to the unauthenticated state.

#### Scenario: Logout clears session and redirects to home

- **WHEN** an authenticated user clicks "Logout" in the navbar
- **THEN** the app calls `POST /api/auth/logout`
- **THEN** `AuthService.currentUser` is set to `null`
- **THEN** the router navigates to `/`
- **THEN** the navbar reverts to showing "Client Login"

#### Scenario: Sidenav nav item text is visible on dark background

- **WHEN** the sidenav is open
- **THEN** all `mat-list-item` labels render in light text (`#e2e8f0`) against the dark navy (`#0f172a`) sidenav background
- **NOTE** Angular Material 21 MDC `mat-list-item` inherits the light-theme text color by default; the `.app-sidenav` host MUST set `--mat-list-list-item-label-text-color: #e2e8f0` and `--mdc-list-list-item-label-text-color: #e2e8f0` to override this

### Requirement: /contact route renders ContactComponent

#### Scenario: Navigating to /contact
- **WHEN** the user navigates to `/contact`
- **THEN** `ContactComponent` is rendered with a "Contact Us" heading and placeholder content
