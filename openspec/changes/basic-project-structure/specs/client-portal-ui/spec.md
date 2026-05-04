## ADDED Requirements

### Requirement: Landing page displays a persistent navbar with Client Login button
The system SHALL render a landing page at `/` with a navbar that is always visible. The navbar SHALL contain the firm name on the left and a "Client Login" button on the right.

#### Scenario: Navbar visible on landing page
- **WHEN** a user navigates to `/`
- **THEN** the navbar is rendered with the firm name and "Client Login" button visible

#### Scenario: Navbar visible when scrolling
- **WHEN** the user scrolls down the landing page
- **THEN** the navbar remains fixed at the top of the viewport

### Requirement: Client Login button opens a dropdown popover
The system SHALL display a dropdown popover directly below the "Client Login" navbar button when it is clicked. The popover SHALL contain a portal title, brief description, "Sign in with Google" button, and a security label.

#### Scenario: Click opens the dropdown
- **WHEN** the user clicks the "Client Login" button
- **THEN** a dropdown popover appears below the button
- **THEN** the popover contains a "Sign in with Google" button

#### Scenario: Click outside dismisses the dropdown
- **WHEN** the dropdown is open and the user clicks outside of it
- **THEN** the dropdown closes

#### Scenario: Sign in with Google triggers OAuth2 redirect
- **WHEN** the user clicks "Sign in with Google" inside the dropdown
- **THEN** the browser navigates to `GET /api/auth/login` initiating the Google OAuth2 flow

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

### Requirement: All HTTP requests include credentials
The system SHALL attach `withCredentials: true` to every Angular `HttpClient` request so the browser sends the JWT cookie automatically.

#### Scenario: Credentials interceptor applies to all requests
- **WHEN** any `HttpClient` request is made
- **THEN** the request is sent with `withCredentials: true`
