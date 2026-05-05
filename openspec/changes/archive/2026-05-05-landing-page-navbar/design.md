## Context

The landing page (`HomeComponent`) has an inline `<nav>` with just a brand name and `ClientPortalLoginComponent`. There is no `NavbarComponent` — the navbar is tightly coupled to `HomeComponent`. The new design (dark navy, reference: `docs/superpowers/specs/2026-05-05-navbar-design.md`) requires logo, nav links, language toggle, and CTA button — enough complexity to justify extraction into a dedicated component.

## Goals / Non-Goals

**Goals:**
- Extract navbar into a reusable `NavbarComponent` with clear single responsibility
- Preserve `ClientPortalLoginComponent` behaviour exactly — zero changes to it
- Introduce `/contact` route as a lazy-loaded placeholder
- Responsive layout: full horizontal on desktop, hamburger drawer on mobile

**Non-Goals:**
- i18n content translation
- Contact form or booking backend
- Active route highlighting
- Any backend changes

## Decisions

### 1. NavbarComponent lives in `src/app/shared/navbar/`

`shared/` is for components used across multiple feature areas. The navbar will eventually appear on the dashboard too, making `shared/` the right home versus `features/home/`.

**Alternatives considered:**
- Keep inline in `HomeComponent` — rejected; too much logic for a single-purpose landing page component
- Put in `features/home/` — rejected; navbar is not home-specific

### 2. ClientPortalLoginComponent is embedded inside NavbarComponent unchanged

The "Client Portal" nav link replaces the old standalone button. `NavbarComponent` imports `ClientPortalLoginComponent` and renders it as a nav item. No props or API changes to `ClientPortalLoginComponent`.

**Alternative considered:** Emit a router event from the nav link and render the dropdown separately — rejected as over-engineering; the component already self-manages its open/close state.

### 3. Language toggle is `signal<'en'|'zh'>` in NavbarComponent — no service

Scope is one component; no other component reads this state in this change. A shared service would be premature. When full i18n is added, this signal moves to an `I18nService`.

**Alternative considered:** Store in `localStorage` — deferred; not needed until actual translation is implemented.

### 4. Responsive breakpoint at 768px via CSS media query

Below 768px: nav links and right actions hidden; hamburger icon shown. Clicking hamburger sets `menuOpen = signal(false)` in `NavbarComponent` to toggle a drawer. No Angular CDK dependency needed.

### 5. ContactComponent is a lazy-loaded placeholder

Route `/contact` is added to `app.routes.ts` as a lazy-loaded standalone component. Content is "coming soon". This keeps the routing contract in place for future implementation without adding dead code.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| `ClientPortalLoginComponent` click-outside listener conflicts with hamburger menu on mobile | Both use `@HostListener('document:click')` — order of execution is deterministic; drawer closes first, then dropdown closes. Test explicitly. |
| CSS specificity clash when navbar moves from `HomeComponent` to `NavbarComponent` | Scoped CSS per component (Angular default) isolates styles; no global leakage. |
