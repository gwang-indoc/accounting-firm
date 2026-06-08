## ADDED Requirements

### Requirement: Look up registered user by email
The system SHALL provide an admin-only endpoint `GET /api/admin/users/lookup?email=` that returns the display name of a registered user matching the given email.

#### Scenario: Email matches a registered user
- **WHEN** an authenticated admin sends `GET /api/admin/users/lookup?email=jane@example.com` and a user with that email exists
- **THEN** the system returns `200 OK` with `{ "name": "Jane Smith" }`

#### Scenario: Email not registered
- **WHEN** an authenticated admin sends `GET /api/admin/users/lookup?email=unknown@example.com` and no user with that email exists
- **THEN** the system returns `404 Not Found`

#### Scenario: Non-admin access blocked
- **WHEN** a non-admin user sends `GET /api/admin/users/lookup?email=jane@example.com`
- **THEN** the system returns `403 Forbidden`

#### Scenario: Missing email parameter
- **WHEN** an authenticated admin sends `GET /api/admin/users/lookup` with no `email` query parameter
- **THEN** the system returns `400 Bad Request`
