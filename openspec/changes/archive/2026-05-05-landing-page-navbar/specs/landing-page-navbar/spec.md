## ADDED Requirements

### Requirement: NavbarComponent renders full navigation bar

The system SHALL render a `NavbarComponent` (`<app-navbar />`) at the top of every page that uses it. The navbar SHALL be fixed at the top of the viewport with a dark navy (`#0f172a`) background and a height of 68px.

#### Scenario: Navbar structure on desktop
- **WHEN** the viewport width is ≥ 768px
- **THEN** the navbar displays left-to-right: logo section, 72px gap, navigation links (Services · Client Portal · Security · Contact), flexible spacer, language toggle, Book Consultation button

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

#### Scenario: Hamburger shown on narrow screens
- **WHEN** the viewport width is < 768px
- **THEN** navigation links and right actions are hidden
- **THEN** a hamburger icon (☰) is visible on the right side of the navbar

#### Scenario: Hamburger toggles drawer
- **WHEN** the user clicks the hamburger icon
- **THEN** a drawer opens below the navbar showing all nav links, language toggle, and Book Consultation button
- **WHEN** the user clicks the hamburger icon again
- **THEN** the drawer closes

### Requirement: /contact route renders ContactComponent

#### Scenario: Navigating to /contact
- **WHEN** the user navigates to `/contact`
- **THEN** `ContactComponent` is rendered with a "Contact Us" heading and placeholder content
