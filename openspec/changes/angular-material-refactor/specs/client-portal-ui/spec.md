## MODIFIED Requirements

### Requirement: Client Portal login entry point is a navbar nav link

The `ClientPortalLoginComponent` is rendered as the "Client Login" desktop nav link inside `NavbarComponent` using `MatMenu`. On mobile, the sidenav renders the Google sign-in card inline — `ClientPortalLoginComponent` is NOT used in the mobile drawer.

#### Scenario: Client Portal nav link opens MatMenu on desktop

- **WHEN** the user clicks "Client Login" in the desktop navbar
- **THEN** a `MatMenu` panel opens below the trigger showing "Sign in with Google"
- **THEN** clicking "Sign in with Google" navigates to `GET /oauth2/authorization/google`

#### Scenario: Click outside closes MatMenu

- **WHEN** the MatMenu is open and the user clicks outside it
- **THEN** the MatMenu closes

### Requirement: Client Portal dropdown popover

The system SHALL display a `MatMenu` panel directly below the "Client Login" `mat-button` trigger when it is clicked. The panel SHALL contain a portal title, brief description, "Sign in with Google" `mat-menu-item` link, and a security label.

#### Scenario: Click opens the MatMenu

- **WHEN** the user clicks the "Client Login" `mat-button`
- **THEN** a `MatMenu` panel appears below the trigger
- **THEN** the panel contains a "Sign in with Google" item

#### Scenario: Click outside dismisses the MatMenu

- **WHEN** the MatMenu is open and the user clicks outside of it
- **THEN** the MatMenu closes

#### Scenario: Sign in with Google triggers OAuth2 redirect

- **WHEN** the user clicks "Sign in with Google" inside the MatMenu
- **THEN** the browser navigates to `GET /oauth2/authorization/google`

### Requirement: AuthService manages authentication state with signals

The system SHALL maintain authentication state using Angular signals. The `AuthService` SHALL expose `currentUser` (signal) and `isAuthenticated` (computed) and load the current user via `GET /api/auth/me` on app initialisation.

#### Scenario: Authenticated user state is available after app init

- **WHEN** the app initialises and the JWT cookie is present and valid
- **THEN** `AuthService.currentUser()` returns the user DTO
- **THEN** `AuthService.isAuthenticated()` returns `true`

#### Scenario: Unauthenticated state after failed /api/auth/me

- **WHEN** the app initialises and `/api/auth/me` returns 401
- **THEN** `AuthService.currentUser()` returns `null`
- **THEN** `AuthService.isAuthenticated()` returns `false`

### Requirement: AuthGuard protects the portal dashboard route

The system SHALL redirect unauthenticated users away from `/portal/**` routes to the landing page `/`.

#### Scenario: Unauthenticated access to dashboard is redirected

- **WHEN** an unauthenticated user navigates to `/portal/dashboard`
- **THEN** the router redirects them to `/`

#### Scenario: Authenticated user can access dashboard

- **WHEN** an authenticated user navigates to `/portal/dashboard`
- **THEN** the dashboard component is rendered with a `mat-toolbar` header and `mat-card` welcome block showing the user's name

### Requirement: DashboardComponent uses Material components

The system SHALL render `DashboardComponent` with a `mat-toolbar color="primary"` header and a `mat-card` for the welcome section.

#### Scenario: Dashboard header renders as MatToolbar

- **WHEN** an authenticated user views the dashboard
- **THEN** a `mat-toolbar` with `color="primary"` displays "Client Portal" and a `mat-stroked-button` logout button

#### Scenario: Welcome block renders as MatCard

- **WHEN** an authenticated user views the dashboard
- **THEN** a `mat-card` displays the user's name and email

### Requirement: Angular dev proxy forwards OAuth2 and API paths to the backend

The Angular dev server proxy (`proxy.conf.json`) SHALL forward the following path prefixes to `http://localhost:8080`:
- `/api` — REST API calls
- `/oauth2` — Spring Security OAuth2 authorization entry points
- `/login/oauth2` — Spring Security OAuth2 callback handler

#### Scenario: Credentials interceptor applies to all requests

- **WHEN** any `HttpClient` request is made
- **THEN** the request is sent with `withCredentials: true`
