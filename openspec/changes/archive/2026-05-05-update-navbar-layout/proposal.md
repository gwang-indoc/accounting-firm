## Why

The `NavbarComponent` was implemented with correct HTML and TypeScript but four CSS rules were never written, causing the running app at `localhost:4200` to look broken — the navbar scrolls away, nav links stack vertically, links render as browser-default blue underlines, and "Book Consultation" appears as a plain link instead of a white button. This fix makes the running app match the approved visual companion mockup.

## What Changes

- Add `position: fixed; top: 0; left: 0; right: 0; z-index: 100; width: 100%` to `.navbar`
- Add `display: flex; align-items: center; gap: 20px` to `.nav-links`
- Add `color: #cbd5e1; text-decoration: none; font-size: 14px; font-weight: 500` to `.nav-links a`
- Add white button styling to `.cta-btn`: `background: #fff; color: #0f172a; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 700; text-decoration: none`

All changes are confined to a single CSS file. No HTML, TypeScript, route, or test changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `landing-page-navbar`: Navbar now renders with correct fixed positioning, horizontal nav links, proper link colours, and styled CTA button — matching the approved visual companion design.

## Impact

- **File changed:** `frontend/src/app/shared/navbar/navbar.component.css` only
- **Visual:** Running app now matches the approved mockup
- **Tests:** Existing 30 unit tests remain green (CSS rules have no bearing on TestBed assertions)
- **Brainstorming spec:** `docs/superpowers/specs/2026-05-05-navbar-layout-fix-design.md`
