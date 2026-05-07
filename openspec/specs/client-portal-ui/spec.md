## ADDED Requirements

### Requirement: Client Portal login entry point is a navbar nav link

The "Client Login" desktop nav link inside `NavbarComponent` is a plain `<a mat-button routerLink="/login">` — there is NO MatMenu. Clicking it navigates to the `/login` page. On mobile, the sidenav renders the same `routerLink="/login"` item.

#### Scenario: Client Login link navigates to /login

- **WHEN** an unauthenticated user clicks "Client Login" in the desktop navbar
- **THEN** the router navigates to `/login`

### Requirement: AuthService manages authentication state with signals

The system SHALL maintain authentication state using Angular signals. The `AuthService` SHALL expose `currentUser` (signal) and `isAuthenticated` (computed) and load the current user via `GET /api/auth/me` on app initialisation. `AuthService` SHALL also expose a `logout()` method that calls `POST /api/auth/logout` and sets `currentUser` to `null`.

#### Scenario: Authenticated user state is available after app init

- **WHEN** the app initialises and the JWT cookie is present and valid
- **THEN** `AuthService.currentUser()` returns the user DTO
- **THEN** `AuthService.isAuthenticated()` returns `true`

#### Scenario: Unauthenticated state after failed /api/auth/me

- **WHEN** the app initialises and `/api/auth/me` returns 401
- **THEN** `AuthService.currentUser()` returns `null`
- **THEN** `AuthService.isAuthenticated()` returns `false`

#### Scenario: Logout clears auth state

- **WHEN** `AuthService.logout()` is called and `POST /api/auth/logout` succeeds
- **THEN** `AuthService.currentUser()` returns `null`
- **THEN** `AuthService.isAuthenticated()` returns `false`

### Requirement: AuthGuard protects the portal dashboard route

The system SHALL redirect unauthenticated users away from `/portal/**` routes to the landing page `/`.

#### Scenario: Unauthenticated access to dashboard is redirected

- **WHEN** an unauthenticated user navigates to `/portal/dashboard`
- **THEN** the router redirects them to `/`

#### Scenario: Authenticated user can access dashboard

- **WHEN** an authenticated user navigates to `/portal/dashboard`
- **THEN** the dashboard component is rendered with a `mat-card` welcome block showing the user's name

### Requirement: DashboardComponent uses Material components

The system SHALL render `DashboardComponent` with a `mat-card` welcome section. There is NO secondary `mat-toolbar` inside the dashboard — the main navbar handles the "Logout" button when authenticated.

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
