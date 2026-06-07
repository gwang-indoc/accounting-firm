## MODIFIED Requirements

### Requirement: Dedicated /login page presents all auth options using Angular Material
The system SHALL render `LoginComponent` at `/login` as a standalone Angular component. The page SHALL present two auth options in a single centered `mat-card` using Angular Material components: Google sign-in and passwordless email-code sign-in. The route SHALL be accessible without authentication.

**Page layout:** The page background is `#f1f5f9` with a subtle dot-grid texture. A single `mat-card` (max-width 400px) is centered horizontally and vertically. The card uses Material CSS variables (`--mdc-elevated-card-container-color`, `--mdc-elevated-card-container-shape`) and has a 3px sky-blue gradient accent stripe (`#0ea5e9` → `#38bdf8` → `#7dd3fc`) pinned to its top edge.

**Card content (top to bottom):**
1. Brand block — dark navy 税 icon (42×42px, `#0f172a` background, `#38bdf8` text) + "GWH Accounting" name + "Secure Tax & Accounting Portal" tagline
2. "CLIENT PORTAL" eyebrow label (sky-blue `#0ea5e9`, uppercase, tracked)
3. "Welcome back" `<h1>` heading
4. "Sign in to access your account" subtitle
5. Google Sign-In button — custom `<a>` styled as a white bordered button with inline Google G SVG logo; links to `/oauth2/authorization/google`
6. "or" divider row (custom, not `mat-divider`)
7. "Sign in with email →" `mat-button` that enters the email-code login flow
8. Security note — lock SVG icon + "Your data is always encrypted in transit"

The email/password "Create an account" and "Sign in with email" (password) options are replaced by the single email-code option. There is no separate `/register` route.

#### Scenario: Login page structure
- **WHEN** the user navigates to `/login`
- **THEN** the page renders a `mat-card` containing the text "Client Portal" (in the eyebrow label)
- **THEN** a Google Sign-In link (`<a href="/oauth2/authorization/google">`) is present with the Google G logo
- **THEN** a "Sign in with email →" control enters the email-code login flow

#### Scenario: Route is not guarded
- **WHEN** an unauthenticated user navigates to `/login`
- **THEN** the page renders without redirection

#### Scenario: Mobile layout
- **WHEN** the viewport width is < 768px
- **THEN** the `mat-card` fills the screen width with horizontal padding
- **THEN** the navbar shows the hamburger icon
