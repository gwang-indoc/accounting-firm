# Navbar Layout Fix — GWH Accounting

## Summary

Fix four missing CSS rules in `NavbarComponent` so the running app matches the approved dark-navy design. The component HTML and TypeScript are unchanged — this is a pure CSS correction.

## Context

The previous `landing-page-navbar` change implemented `NavbarComponent` with correct HTML structure and signal-based logic, but four CSS rules were never written:

1. `.navbar` has no `position: fixed` — navbar scrolls away instead of sticking to the top
2. `.nav-links` has no `display: flex` — nav links stack vertically instead of appearing inline
3. `.nav-links a` has no colour or text-decoration — links render as browser-default blue with underlines
4. `.cta-btn` has no styling — "Book Consultation" appears as a plain link instead of a white button

## Goals / Non-Goals

**Goals:**
- Make the running app at `localhost:4200` match the approved visual companion mockup exactly
- Fix all four missing CSS rules in a single surgical edit

**Non-Goals:**
- Hover / focus states (deferred — Option A chosen)
- CSS custom properties or theming refactor
- Any HTML, TypeScript, or test changes

## Changes

**File:** `frontend/src/app/shared/navbar/navbar.component.css`

### 1. `.navbar` — add fixed positioning

```css
position: fixed;
top: 0;
left: 0;
right: 0;
z-index: 100;
width: 100%;
```

### 2. `.nav-links` — add flex layout (new rule)

```css
.nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
}
```

### 3. `.nav-links a` — add link styling (new rule)

```css
.nav-links a {
  color: #cbd5e1;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}
```

### 4. `.cta-btn` — add CTA button styling (new rule)

```css
.cta-btn {
  background: #ffffff;
  color: #0f172a;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}
```

## No Other Changes

- `home.component.css` already has `margin-top: 68px` on `main` — the page content offset is correct for a 68px fixed navbar
- No HTML, TypeScript, route, or test changes required
- Existing 30 unit tests remain green (CSS rules have no bearing on TestBed assertions)
