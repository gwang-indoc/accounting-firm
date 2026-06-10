# Client Management API Spec

> Source: openspec/specs/client-management/spec.md
> Collected: 2026-05-21
> Published: Unknown

## ADDED Requirements

### Requirement: Create a client
The system SHALL allow an authenticated user to create a client record with name (required), email (optional), and phone (optional). The created client SHALL be returned in the response.

#### Scenario: Successful client creation
- **WHEN** an authenticated user sends `POST /api/clients` with a valid name
- **THEN** the system creates the client, persists it, and returns `201 Created` with the client JSON

#### Scenario: Missing required name
- **WHEN** an authenticated user sends `POST /api/clients` without a name field
- **THEN** the system returns `400 Bad Request`

---

### Requirement: List all clients
The system SHALL allow an authenticated user to retrieve all clients as a list.

#### Scenario: Successful list
- **WHEN** an authenticated user sends `GET /api/clients`
- **THEN** the system returns `200 OK` with a JSON array of all clients (may be empty)

---

### Requirement: Get a single client
The system SHALL allow an authenticated user to retrieve a single client by ID.

#### Scenario: Client exists
- **WHEN** an authenticated user sends `GET /api/clients/{clientId}` for an existing client
- **THEN** the system returns `200 OK` with the client JSON

#### Scenario: Client not found
- **WHEN** an authenticated user sends `GET /api/clients/{clientId}` for a non-existent ID
- **THEN** the system returns `404 Not Found`
