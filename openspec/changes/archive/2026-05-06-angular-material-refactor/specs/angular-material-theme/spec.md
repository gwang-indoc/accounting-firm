## ADDED Requirements

### Requirement: Angular Material 21 is installed and themed

The system SHALL have `@angular/material` 21 and `@angular/cdk` 21 installed as dependencies. The app config SHALL include `provideAnimationsAsync()`. A custom Material theme SHALL be defined in `styles.css` using `mat.define-theme()` with `$azure-palette` as the primary palette and a light theme type. The `mat-toolbar[color="primary"]` SHALL render with background `#0f172a` (dark navy) and white text. The page body background SHALL be `#f1f5f9`.

#### Scenario: Material theme is applied globally

- **WHEN** the Angular app loads
- **THEN** Material component CSS tokens are available globally
- **THEN** `mat-toolbar[color="primary"]` has `background-color: #0f172a`
- **THEN** `mat-toolbar[color="primary"]` text renders in white (`#ffffff`)
- **THEN** `document.body` computed background is `#f1f5f9`
- **NOTE** Angular Material 21 MDC toolbar controls child text via `--mat-toolbar-container-text-color`; the global override MUST set this variable alongside `color: #ffffff` to ensure text inside the toolbar (e.g. `<span>` titles) is visible

#### Scenario: Animations provider is registered

- **WHEN** the app bootstraps
- **THEN** `provideAnimationsAsync()` is present in `app.config.ts` providers
- **THEN** Material component animations (sidenav slide, menu open) function correctly
