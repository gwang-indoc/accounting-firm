## ADDED Requirements

### Requirement: Client Portal login entry point is a navbar nav link
The `ClientPortalLoginComponent` is rendered as the "Client Portal" nav link inside `NavbarComponent`. The component itself — its dropdown, Google OAuth2 link, open/close behaviour, and all tests — is unchanged. Only its host location changed from `HomeComponent` to `NavbarComponent`.

#### Scenario: Client Portal nav link opens login dropdown
- **WHEN** the user clicks "Client Portal" in the navbar
- **THEN** the `ClientPortalLoginComponent` dropdown opens showing "Sign in with Google"
- **THEN** clicking "Sign in with Google" navigates to `GET /oauth2/authorization/google`

#### Scenario: Click outside closes dropdown
- **WHEN** the dropdown is open and the user clicks outside it
- **THEN** the dropdown closes

### Requirement: Client Portal dropdown popover
The system SHALL display a dropdown popover directly below the "Client Portal" nav link when it is clicked. The popover SHALL contain a portal title, brief description, "Sign in with Google" button, and a security label.

#### Scenario: Click opens the dropdown
- **WHEN** the user clicks the "Client Portal" nav link
- **THEN** a dropdown popover appears below the link
- **THEN** the popover contains a "Sign in with Google" button

#### Scenario: Click outside dismisses the dropdown
- **WHEN** the dropdown is open and the user clicks outside of it
- **THEN** the dropdown closes

#### Scenario: Sign in with Google triggers OAuth2 redirect
- **WHEN** the user clicks "Sign in with Google" inside the dropdown
- **THEN** the browser navigates to `GET /oauth2/authorization/google` — Spring Security's OAuth2 authorization entry point — initiating the Google OAuth2 flow

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
- **THEN** the dashboard component is rendered showing the user's name

### Requirement: Angular dev proxy forwards OAuth2 and API paths to the backend
The Angular dev server proxy (`proxy.conf.json`) SHALL forward the following path prefixes to `http://localhost:8080`:
- `/api` — REST API calls
- `/oauth2` — Spring Security OAuth2 authorization entry points (e.g. `/oauth2/authorization/google`)
- `/login/oauth2` — Spring Security OAuth2 callback handler (e.g. `/login/oauth2/code/google`)

This ensures the full OAuth2 redirect dance is handled by the backend even when the frontend runs on a different port during development.

### Requirement: All HTTP requests include credentials
The system SHALL attach `withCredentials: true` to every Angular `HttpClient` request so the browser sends the JWT cookie automatically.

#### Scenario: Credentials interceptor applies to all requests
- **WHEN** any `HttpClient` request is made
- **THEN** the request is sent with `withCredentials: true`
