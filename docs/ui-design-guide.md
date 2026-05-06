# UI Design Guide

## Component Library

This project uses **Angular Material** (`@angular/material`) as its primary component library, implementing Google's [Material Design 3](https://m3.material.io/) specification. All UI components should be sourced from Angular Material before considering custom alternatives.

Install (if not already present):
```bash
cd frontend && ng add @angular/material
```

---

## Design Tokens

### Colour Palette

| Role | Hex | Usage |
|---|---|---|
| Surface / Background | `#0f172a` | Navbar, page background |
| Surface elevated | `#1e293b` | Cards, drawers, logo icon |
| Border / Divider | `#334155` | Input borders, separators |
| Text primary | `#ffffff` | Headings, body text on dark |
| Text secondary | `#cbd5e1` | Nav links, secondary labels |
| Text muted | `#94a3b8` | Inactive pill labels |
| Accent / Primary | `#38bdf8` | Active pill, tagline, highlights |
| CTA background | `#ffffff` | "Book Consultation" button |
| CTA text | `#0f172a` | Text on white CTA button |

### Typography

| Level | Size | Weight | Usage |
|---|---|---|---|
| Brand name | 16px | 700 | Company name in navbar |
| Tagline | 12px | 400 | Subtitle below brand name |
| Nav link | 14px | 500 | Desktop navigation links |
| Body | 15px | 400 | Mobile drawer links |
| Button | 14px | 700 | CTA button label |

Use the system font stack inherited from the browser (`font-family: inherit`). Do not import a custom web font unless explicitly required.

### Spacing & Sizing

| Token | Value | Usage |
|---|---|---|
| Navbar height | 68px | Fixed navbar; page `margin-top` matches |
| Navbar padding | `0 24px` | Horizontal gutter |
| Nav link gap | 20px | Space between desktop nav items |
| Border radius — small | 6px | CTA button, input fields |
| Border radius — pill | 9999px | Language toggle pills |
| Logo icon size | 42×42px | Navbar brand icon |
| Logo border radius | 8px | Logo icon corners |

---

## Angular Material Usage

### Theming

Define a custom Material theme in `frontend/src/styles.css` (or `_theme.scss`) using the project colour tokens above. Map:
- `primary` → `#38bdf8`
- `surface` → `#0f172a`
- `on-surface` → `#ffffff`

### Component Guidelines

| Need | Angular Material component | Notes |
|---|---|---|
| Buttons | `MatButton` (`mat-button`, `mat-raised-button`, `mat-flat-button`) | Use `mat-flat-button` for primary CTAs |
| Form fields | `MatFormField` + `MatInput` | Use `appearance="outline"` |
| Icons | `MatIcon` | Use Material Symbols icon font |
| Navigation drawer | `MatSidenav` | For future full side-nav; current mobile drawer is custom |
| Dialogs / modals | `MatDialog` | Wrap all modal content |
| Snackbars | `MatSnackBar` | For transient feedback messages |
| Tables | `MatTable` | For invoice / transaction lists |
| Progress indicators | `MatProgressSpinner`, `MatProgressBar` | During API calls |
| Chips / tags | `MatChip` | Status labels (e.g., invoice status) |
| Menus | `MatMenu` | Dropdown menus (e.g., user account menu) |
| Tooltips | `MatTooltip` | Icon-only buttons must have a tooltip |

### Do / Don't

**Do:**
- Import only the specific Material modules each standalone component needs (tree-shakeable).
- Use Material elevation tokens (`mat-elevation-z2`, etc.) rather than custom `box-shadow` values.
- Use `MatRipple` on interactive custom elements to match Material interaction feedback.

**Don't:**
- Import `MatLegacyModule` — use the current (non-legacy) APIs only.
- Override Material component internals with `::ng-deep` unless there is no other option; document the reason in a comment.
- Mix Material components with a second component library (e.g., Bootstrap, PrimeNG).

---

## Layout

- **Fixed navbar**: always 68px tall; all page content has `margin-top: 68px` to clear it.
- **Breakpoint**: mobile drawer activates at `max-width: 767px`.
- **Page max-width**: not capped — full-width layouts. Individual content sections may use a `max-width` of `1280px` with `margin: 0 auto`.
- **Grid**: use CSS Grid or `MatGridList` for card-based layouts; use Flexbox for single-axis alignment.

---

## Accessibility

- All interactive elements must have a visible focus indicator.
- Icon-only buttons require `aria-label` and `MatTooltip`.
- Colour contrast must meet WCAG AA (4.5:1 for normal text, 3:1 for large text).
- Form fields must use `MatLabel` — do not rely on `placeholder` as the only label.

---

## File Conventions

- Global styles: `frontend/src/styles.css`
- Material theme: defined in `styles.css` or a dedicated `_theme.scss` imported there
- Component styles: scoped in `*.component.css` (Angular's emulated encapsulation)
- No inline `style=""` attributes in templates
