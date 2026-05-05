## Why

The landing page currently has a minimal inline navbar with only a brand name and a "Client Login" button — no navigation links, no language toggle, and no call-to-action. This makes the site look unfinished and provides no way to navigate to key sections. A proper navigation bar improves first impressions and gives visitors clear wayfinding.

## What Changes

- Extract the inline `<nav>` from `HomeComponent` into a new standalone `NavbarComponent` under `src/app/shared/navbar/`
- `NavbarComponent` renders: logo icon + company name + tagline, navigation links (Services, Client Portal, Security, Contact), EN|中文 language toggle, and a Book Consultation CTA button
- "Client Portal" nav link hosts the existing `ClientPortalLoginComponent` dropdown unchanged
- `HomeComponent` is updated to use `<app-navbar />` and gains `id` anchors on sections; a new Security section placeholder is added
- New lazy-loaded `ContactComponent` at route `/contact` (placeholder "coming soon" page)
- `BookConsultation` button and Contact nav link both navigate to `/contact`
- Language toggle is UI-only — stores `signal<'en'|'zh'>` in `NavbarComponent`; no content translation in this change
- Navbar is responsive: collapses to hamburger menu on screens narrower than 768px

## Capabilities

### New Capabilities

- `landing-page-navbar`: Full navigation bar for the landing page — logo, nav links, language toggle, CTA button, and responsive hamburger menu

### Modified Capabilities

- `client-portal-ui`: "Client Portal" entry point moves from a standalone button in the navbar to a nav link within `NavbarComponent`; the `ClientPortalLoginComponent` dropdown itself is unchanged

## Impact

- **Frontend only** — no backend changes
- Files modified: `home.component.html`, `home.component.ts`, `home.component.css`, `app.routes.ts`
- Files created: `src/app/shared/navbar/navbar.component.{ts,html,css}`, `src/app/features/contact/contact.component.{ts,html,css}`
- E2E tests required: navbar renders, nav links work, Client Portal dropdown opens, language toggle switches, Book Consultation navigates to `/contact`

## Non-Goals

- Actual i18n / content translation (language toggle is UI state only)
- Contact form or booking system implementation
- Logo image file (CSS-rendered "税" character icon)
- Active route highlighting on nav links
- Any backend API changes

## Brainstorming Spec

Design decisions documented in `docs/superpowers/specs/2026-05-05-navbar-design.md`.
