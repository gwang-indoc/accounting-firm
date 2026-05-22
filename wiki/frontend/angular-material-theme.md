# Angular Material Theme

> Sources: Project OpenSpec, 2026-05-21
> Raw: [openspec-angular-material-theme](../../raw/frontend/openspec-angular-material-theme.md)

## Overview

The app uses Angular Material 21 with a custom theme that overrides the default Material palette to a dark navy / sky-blue design language. Several MDC-specific token overrides are required because Angular Material 21's MDC-based components don't always pick up simple CSS `color` rules.

## Setup

Dependencies: `@angular/material` 21, `@angular/cdk` 21.

`app.config.ts` providers must include `provideAnimationsAsync()` (required for sidenav slide and menu animations).

## Theme Definition

Defined in `styles.css` via `mat.define-theme()`:
- Primary palette: `$azure-palette`
- Theme type: `light`

## Color Tokens

| Token | Value | Usage |
|---|---|---|
| `mat-toolbar[color="primary"]` background | `#0f172a` | Dark navy navbar |
| `mat-toolbar` text | `#ffffff` | Navbar links |
| `document.body` background | `#f1f5f9` | Page background |
| Sky-blue accent | `#38bdf8` | Tagline, active pills, highlights |

## MDC Caveats

**Toolbar text:** Angular Material 21 MDC toolbar controls child text via `--mat-toolbar-container-text-color`. Setting only `color: #ffffff` on the toolbar is insufficient — the CSS variable must also be set:

```css
mat-toolbar[color="primary"] {
  background-color: #0f172a;
  color: #ffffff;
  --mat-toolbar-container-text-color: #ffffff;
}
```

## See Also

- [Navbar and Layout](navbar-and-layout.md)
- [Auth Pages](auth-pages.md)
- [Client Portal Dashboard](client-portal-dashboard.md)
