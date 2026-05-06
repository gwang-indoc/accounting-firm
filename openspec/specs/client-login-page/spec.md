## Requirements

### Requirement: Dedicated /login page presents all auth options using Angular Material
The system SHALL render `LoginComponent` at `/login` as a standalone Angular component. The page SHALL present three auth options in a single centered `mat-card` (Layout A — stacked) using Angular Material components. The route SHALL be accessible without authentication.

#### Scenario: Login page structure
- **WHEN** the user navigates to `/login`
- **THEN** the page renders a `mat-card` with heading "Client Portal"
- **THEN** a "Sign in with Google" `mat-flat-button` (Google blue `#4285f4`) links to `/oauth2/authorization/google`
- **THEN** a `mat-divider` separates the Google button from the Register button
- **THEN** a "Register New Account" `mat-stroked-button` navigates to `/register`
- **THEN** a `mat-divider` separates the Register button from the email login link
- **THEN** a "Sign in with Email →" `mat-button` navigates to `/login/email`

#### Scenario: Success snackbar after registration
- **WHEN** the user arrives at `/login?registered=true`
- **THEN** a `MatSnackBar` notification is shown: "Account created! Please sign in."

#### Scenario: Route is not guarded
- **WHEN** an unauthenticated user navigates to `/login`
- **THEN** the page renders without redirection

#### Scenario: Mobile layout
- **WHEN** the viewport width is < 768px
- **THEN** the `mat-card` fills the screen width
- **THEN** the navbar shows the hamburger icon
