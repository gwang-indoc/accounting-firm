## MODIFIED Requirements

### Requirement: Dedicated /login page presents all auth options using Angular Material
The system SHALL render `LoginComponent` at `/login` as a standalone Angular component. The page SHALL present Google OAuth2 and email-code authentication options. The route SHALL be accessible without authentication. All visible text on the page SHALL be rendered through the `| translate` pipe using `ngx-translate`, enabling EN/Chinese switching without page reload.

**Page layout:** Two-panel layout: left brand panel (`brand-panel`) and right login form panel (`login-panel`). Brand panel contains the firm name, tagline, headline, description, trust bullet list, and copyright — all translated via `| translate`. Login panel contains eyebrow, heading, subtitle, Google button, "or" divider, email-code sub-component, and security note — all translated via `| translate`.

**Card content (top to bottom, login panel):**
1. Eyebrow label (`login.eyebrow`) — translated
2. Heading (`login.welcome`) — translated
3. Subtitle (`login.sub`) — translated
4. Google Sign-In button — label via `login.google` key; links to `/oauth2/authorization/google`
5. "or" divider row — label via `login.orDivider` key
6. `<app-login-email-code>` sub-component (multi-step email OTP flow, fully bilingual)
7. Security note — label via `login.dataProtection` key

#### Scenario: Login page structure
- **WHEN** the user navigates to `/login`
- **THEN** the page renders the brand panel and login panel
- **THEN** a Google Sign-In link (`<a href="/oauth2/authorization/google">`) is present
- **THEN** the `app-login-email-code` sub-component is rendered

#### Scenario: Route is not guarded
- **WHEN** an unauthenticated user navigates to `/login`
- **THEN** the page renders without redirection

#### Scenario: Login page text switches language
- **WHEN** the user toggles from EN to ZH
- **THEN** all visible text on `/login` (headings, labels, button text, trust bullets) switches to Chinese without page reload
- **THEN** user-entered form values (if any) are unchanged

### Requirement: Email OTP login flow is fully bilingual
The system SHALL render all visible strings in the `LoginEmailCodeComponent` (email step, code step, name step) through `| translate`, using `emailCode.*` translation keys. Error messages set in the component SHALL use translation key strings (not raw English) so the template's `{{ error() | translate }}` renders them in the active language.

#### Scenario: Email step renders in active language
- **WHEN** the user is on the email step of the login flow
- **THEN** the field label, button text, and any error messages render in the currently selected language

#### Scenario: Code step renders in active language
- **WHEN** the user is on the code step
- **THEN** "We sent a 6-digit code to …" message, button labels, resend/change links render in the currently selected language

#### Scenario: Name step renders in active language
- **WHEN** the user is on the name step (new account signup)
- **THEN** the instruction text, field label, and button text render in the currently selected language
