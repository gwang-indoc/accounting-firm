## ADDED Requirements

### Requirement: NavbarComponent renders full navigation bar

The system SHALL render a `NavbarComponent` (`<app-navbar />`) at the top of every page that uses it. The navbar SHALL be fixed at the top of the viewport with a dark navy (`#0f172a`) background and a height of 68px. The navbar SHALL use `position: fixed; top: 0; left: 0; right: 0; z-index: 100` (no `width: 100%` — `left: 0; right: 0` already constrains the element to viewport width without causing padding overflow) so it remains visible as the user scrolls.

#### Scenario: Navbar structure on desktop

- **WHEN** the viewport width is ≥ 768px
- **THEN** the navbar displays left-to-right: logo section, navigation links (Services · Security · Client Portal · Contact), Book Consultation CTA button, language toggle
- **THEN** navigation links are laid out horizontally in a single row using `display: flex; align-items: center; gap: 20px`
- **THEN** each navigation link (including the "Client Login" trigger button) has colour `#cbd5e1`, `text-decoration: none`, `font-size: 14px`, `font-weight: 500`, `background: transparent`, `border: none`
- **THEN** the "Book Consultation" link renders as a white button with `background: #fff; color: #0f172a; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 700`
- **THEN** the navbar stays fixed at the top as the user scrolls

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
- **THEN** the "EN" pill is active (white background) and "中文" is inactive

#### Scenario: Clicking 中文 activates Chinese
- **WHEN** the user clicks "中文"
- **THEN** the "中文" pill becomes active and "EN" becomes inactive
- **THEN** `NavbarComponent.lang()` returns `'zh'`

#### Scenario: Clicking EN restores English
- **WHEN** `lang()` is `'zh'` and the user clicks "EN"
- **THEN** `lang()` returns `'en'` and "EN" pill is active

### Requirement: Navbar collapses to hamburger menu on mobile

The system SHALL collapse the navbar to a hamburger menu on narrow screens, with a drawer that matches the approved visual companion design.

#### Scenario: Hamburger icon toggles between open and closed states

- **WHEN** the drawer is closed
- **THEN** the hamburger button displays ☰
- **WHEN** the drawer is open
- **THEN** the hamburger button displays ✕

#### Scenario: Mobile drawer layout and positioning

- **WHEN** the hamburger is clicked and the drawer opens
- **THEN** the drawer SHALL use `position: fixed; top: 68px; left: 0; right: 0; z-index: 99` so it appears directly below the fixed navbar and above page content
- **THEN** the drawer background SHALL be `#0f172a` with `padding: 16px` and a `border-top: 1px solid #1e293b` separator

#### Scenario: Drawer navigation links

- **WHEN** the drawer is open
- **THEN** each navigation link (Services, Security, Contact) SHALL display as `display: block` with `padding: 14px 8px`, `color: #e2e8f0`, `font-size: 15px`, and a `border-bottom: 1px solid #1e293b` separator
- **THEN** the "Client Login" button SHALL display with the same `padding: 14px 8px`, `font-size: 15px`, `color: #e2e8f0`, left-aligned, matching other drawer links (implemented via `:host(.drawer-item)` on `ClientPortalLoginComponent`)
- **THEN** the "Book Consultation" link SHALL render as a compact white button (`background: #fff; color: #0f172a; padding: 8px 16px; border-radius: 6px; font-weight: 700`) using `display: inline-block; margin: 14px 8px` — NOT full-width, left-aligned with other items
- **THEN** the language toggle row SHALL be visible with `display: flex; gap: 8px; padding: 14px 8px` and a `border-top: 1px solid #1e293b` separator above it

### Requirement: /contact route renders ContactComponent

#### Scenario: Navigating to /contact
- **WHEN** the user navigates to `/contact`
- **THEN** `ContactComponent` is rendered with a "Contact Us" heading and placeholder content
