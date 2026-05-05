## MODIFIED Requirements

### Requirement: NavbarComponent renders full navigation bar

The system SHALL render a `NavbarComponent` (`<app-navbar />`) at the top of every page that uses it. The navbar SHALL be fixed at the top of the viewport with a dark navy (`#0f172a`) background and a height of 68px. The navbar SHALL use `position: fixed; top: 0; left: 0; right: 0; z-index: 100; width: 100%` so it remains visible as the page scrolls.

#### Scenario: Navbar structure on desktop

- **WHEN** the viewport width is ≥ 768px
- **THEN** the navbar displays left-to-right: logo section, navigation links (Services · Security · Client Portal · Contact), Book Consultation CTA button, language toggle
- **THEN** navigation links are laid out horizontally in a single row using `display: flex; align-items: center; gap: 20px`
- **THEN** each navigation link has colour `#cbd5e1`, `text-decoration: none`, `font-size: 14px`, `font-weight: 500`
- **THEN** the "Book Consultation" link renders as a white button with `background: #fff; color: #0f172a; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 700`
- **THEN** the navbar stays fixed at the top as the user scrolls

#### Scenario: Logo section

- **WHEN** the navbar renders
- **THEN** the logo section shows a 42×42px dark rounded icon containing "税", company name "GWH Accounting" in white bold, and tagline "Secure Tax & Accounting Portal" in `#38bdf8`
