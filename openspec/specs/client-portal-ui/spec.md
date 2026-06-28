## Purpose

The client portal provides authenticated clients with a personalised view of their engagements, documents, and messages. It manages authentication state via Angular signals, enforces route guards for protected pages, and communicates with the backend exclusively through the Angular dev proxy.
## Requirements
### Requirement: Client Portal login entry point is a navbar nav link

The system SHALL render the "Client Login" entry point as a plain `<a mat-button routerLink="/login">` inside `NavbarComponent` — there is NO MatMenu. Clicking it navigates to the `/login` page. On mobile, the sidenav SHALL render the same `routerLink="/login"` item.

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

### Requirement: DashboardComponent layout

The system SHALL render `DashboardComponent` with the following sections. There is NO secondary `mat-toolbar` inside the dashboard — the main navbar handles the "Logout" button when authenticated.

**Hero greeting band** — full-width dark navy header (`#0f172a`) with a time-of-day greeting label ("Good morning / Good afternoon / Good evening"), the authenticated user's name as a large heading, and the current date. No "Secure Session" badge.

**Account Overview card** (`mat-card`, full-width) — shows the user's name as `mat-card-title`, email as `mat-card-subtitle`, and a two-stat row:
- Documents (value populated by future API)
- Tax Year (hardcoded `2025` until API provides it)
No "Pending Review" stat.

**Quick Actions card** (`mat-card`) — contains a single full-width "Upload Document" button (`mat-button`). Text label only, no icon.

**Messages card** (`mat-card`) — displays a list of clickable message rows. Each row shows an unread indicator dot (sky-blue `#38bdf8`, visible only for unread messages), the message title (bold when unread), sender name, and date. A sky-blue pill badge showing the unread count appears in the card title when `unreadCount > 0`. When no messages exist, an empty state is shown instead. Clicking a row is wired for future navigation to a message detail view.

#### Scenario: Welcome block renders as MatCard

- **WHEN** an authenticated user views the dashboard
- **THEN** a `mat-card` displays the user's name and email

#### Scenario: Dashboard hero shows time-of-day greeting

- **WHEN** an authenticated user views the dashboard
- **THEN** the hero band displays "Good morning", "Good afternoon", or "Good evening" based on the current hour

#### Scenario: Messages unread badge

- **WHEN** the Messages card renders and there are unread messages
- **THEN** a pill badge showing the unread count appears to the right of the "Messages" title
- **WHEN** all messages are read
- **THEN** no badge is rendered

### Requirement: Angular dev proxy forwards OAuth2 and API paths to the backend

The Angular dev server proxy (`proxy.conf.json`) SHALL forward the following path prefixes to `http://localhost:8080`:
- `/api` — REST API calls
- `/oauth2` — Spring Security OAuth2 authorization entry points
- `/login/oauth2` — Spring Security OAuth2 callback handler

#### Scenario: Credentials interceptor applies to all requests

- **WHEN** any `HttpClient` request is made
- **THEN** the request is sent with `withCredentials: true`

### Requirement: Client portal displays engagement name in engagement list
The client portal engagement list SHALL display the engagement name alongside the tax year and status for each engagement, so clients can identify which filing each engagement refers to.

#### Scenario: Engagement name visible in portal list
- **WHEN** an authenticated client views their engagement list in the portal
- **THEN** each engagement row shows the engagement name, tax year, and current status

#### Scenario: Multiple engagements for same year are distinguishable
- **WHEN** a client has two engagements for the same tax year (e.g., personal return and corporation)
- **THEN** both rows appear with distinct names, making them unambiguously identifiable

