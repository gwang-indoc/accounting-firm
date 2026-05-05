## MODIFIED Requirements

### Requirement: Client Portal login entry point is a navbar nav link

**Previous:** The "Client Login" button was rendered directly by `HomeComponent` via `<app-client-portal-login />` placed in the navbar-end slot.

**Updated:** The `ClientPortalLoginComponent` is rendered as the "Client Portal" nav link inside `NavbarComponent`. The component itself — its dropdown, Google OAuth2 link, open/close behaviour, and all tests — is unchanged. Only its host location changes from `HomeComponent` to `NavbarComponent`.

#### Scenario: Client Portal nav link opens login dropdown
- **WHEN** the user clicks "Client Portal" in the navbar
- **THEN** the `ClientPortalLoginComponent` dropdown opens showing "Sign in with Google"
- **THEN** clicking "Sign in with Google" navigates to `GET /oauth2/authorization/google`

#### Scenario: Click outside closes dropdown
- **WHEN** the dropdown is open and the user clicks outside it
- **THEN** the dropdown closes
