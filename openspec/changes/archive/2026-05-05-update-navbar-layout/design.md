## Context

`NavbarComponent` was built with correct HTML structure and TypeScript logic in the `landing-page-navbar` change, but four CSS rules were omitted from `navbar.component.css`. The result is a visually broken navbar in the running app:

- Navbar scrolls away with the page (missing `position: fixed`)
- Nav links stack vertically (missing `display: flex` on `.nav-links`)
- Links render as browser-default blue with underlines (missing `.nav-links a` colour rules)
- "Book Consultation" appears as a plain link (missing `.cta-btn` styles)

The approved visual companion mockup and the design spec at `docs/superpowers/specs/2026-05-05-navbar-layout-fix-design.md` define the target.

## Goals / Non-Goals

**Goals:**
- Make `localhost:4200` match the approved visual companion mockup exactly
- Fix all four missing CSS rules in a single surgical edit to `navbar.component.css`

**Non-Goals:**
- Hover / focus / active states (deferred)
- CSS custom properties or theming
- Any HTML, TypeScript, route, or test changes
- `home.component.css` — `margin-top: 68px` on `main` is already correct

## Decisions

### Surgical CSS edit — no refactor

**Choice:** Add the four missing rules directly to `navbar.component.css`, no restructuring.

**Alternatives considered:**
- CSS custom properties (`--navbar-height`, `--link-colour`) — rejected: over-engineering a 4-line fix
- Splitting CSS into sub-files — rejected: premature abstraction, nothing else touches these rules yet

**Rationale:** The simplest fix that makes the app match the spec. Any refactor belongs in a separate change.

### `position: fixed` over `position: sticky`

**Choice:** `position: fixed` with explicit `top:0; left:0; right:0; width:100%`.

**Alternatives considered:**
- `position: sticky; top: 0` — simpler but depends on stacking context of parent; `position: fixed` is unambiguous and already specified in the design spec.

**Rationale:** Matches the approved spec and visual companion mockup exactly.

## Risks / Trade-offs

- **Minimal risk** — only one CSS file changes; no logic, no tests, no routes affected.
- No regression to existing 30 unit tests (CSS is not observable in Angular TestBed).
