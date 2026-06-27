## Purpose
Allows authenticated admins to manage client records — create, list, and retrieve clients scoped to the admin's ownership.
## Requirements
### Requirement: Create a client
The system SHALL allow an authenticated admin to create a client record with name (required), email (required, must match a registered user, must not already exist in clients), and phone (optional). The `admin_id` SHALL be set to the authenticated admin's user ID. The created client SHALL be returned in the response.

#### Scenario: Successful client creation
- **WHEN** an authenticated admin sends `POST /api/clients` with a valid name and an email that exists in `users` and is not already in `clients`
- **THEN** the system creates the client with `admin_id` set to the admin's ID, persists it, and returns `201 Created` with the client JSON

#### Scenario: Missing required name
- **WHEN** an authenticated admin sends `POST /api/clients` without a name field
- **THEN** the system returns `400 Bad Request`

#### Scenario: Email not registered
- **WHEN** an authenticated admin sends `POST /api/clients` with an email that does not exist in the `users` table
- **THEN** the system returns `400 Bad Request` with an error indicating the email is not registered

#### Scenario: Duplicate email
- **WHEN** an authenticated admin sends `POST /api/clients` with an email that already exists in the `clients` table (any admin)
- **THEN** the system returns `409 Conflict`

---

### Requirement: List all clients
The system SHALL allow an authenticated admin to retrieve only the clients they own (where `admin_id` matches the authenticated admin's ID).

#### Scenario: Successful list
- **WHEN** an authenticated admin sends `GET /api/clients`
- **THEN** the system returns `200 OK` with a JSON array of clients owned by that admin only (may be empty)

---

### Requirement: Get a single client
The system SHALL allow an authenticated admin to retrieve a single client by ID only if that client's `admin_id` matches the authenticated admin's ID.

#### Scenario: Client exists and owned by admin
- **WHEN** an authenticated admin sends `GET /api/clients/{clientId}` for a client they own
- **THEN** the system returns `200 OK` with the client JSON

#### Scenario: Client not found
- **WHEN** an authenticated admin sends `GET /api/clients/{clientId}` for a non-existent ID
- **THEN** the system returns `404 Not Found`

#### Scenario: Client owned by different admin
- **WHEN** an authenticated admin sends `GET /api/clients/{clientId}` for a client owned by a different admin
- **THEN** the system returns `403 Forbidden`

---

### Requirement: Client email is unique and required
The `clients.email` column SHALL be NOT NULL and globally UNIQUE across all client records.

#### Scenario: Unique constraint enforced at DB level
- **WHEN** two client records attempt to share the same email value
- **THEN** the database rejects the second insert with a unique constraint violation

### Requirement: Client admin ownership
Every client record SHALL have a non-null `admin_id` referencing the `users` table. The `admin_id` is set on creation and is immutable.

#### Scenario: admin_id set on creation
- **WHEN** an admin creates a client
- **THEN** the persisted record has `admin_id` equal to the authenticated admin's user ID

#### Scenario: admin_id not null
- **WHEN** a client record is inserted without `admin_id`
- **THEN** the database rejects the insert with a NOT NULL constraint violation

### Requirement: Client has a business type
Every client record SHALL have a `business_type` field with one of three values: PERSONAL, CORPORATE, or SELF_EMPLOYED. The field is required on creation and may be updated by the admin.

#### Scenario: Create client with valid business type
- **WHEN** an authenticated admin sends `POST /api/admin/clients` with `businessType` set to PERSONAL, CORPORATE, or SELF_EMPLOYED
- **THEN** the system persists the business type and returns `201 Created` with the client JSON including `businessType`

#### Scenario: Create client without business type
- **WHEN** an authenticated admin sends `POST /api/admin/clients` without a `businessType` field
- **THEN** the system returns `400 Bad Request`

#### Scenario: Create client with invalid business type
- **WHEN** an authenticated admin sends `POST /api/admin/clients` with an unrecognised `businessType` value
- **THEN** the system returns `400 Bad Request`

---

### Requirement: Client fiscal year end
Every client SHALL have a fiscal year end represented as a month (1–12) and day (1–31) pair. For PERSONAL clients, the fiscal year end is always December 31 and SHALL be ignored if supplied — it is stored as month=12, day=31. For CORPORATE and SELF_EMPLOYED clients, the admin SHALL supply a valid month/day on creation; the pair must represent a real calendar date (e.g., Feb 30 is rejected).

#### Scenario: Personal client — fiscal year end fixed
- **WHEN** an authenticated admin creates a PERSONAL client
- **THEN** the system stores `fiscal_year_end_month=12`, `fiscal_year_end_day=31` regardless of any supplied value

#### Scenario: Non-personal client — valid fiscal year end
- **WHEN** an authenticated admin creates a CORPORATE or SELF_EMPLOYED client with a valid `fiscalYearEndMonth` and `fiscalYearEndDay` (e.g., month=3, day=31)
- **THEN** the system persists the supplied values and returns them in the response

#### Scenario: Non-personal client — missing fiscal year end
- **WHEN** an authenticated admin creates a CORPORATE or SELF_EMPLOYED client without `fiscalYearEndMonth` or `fiscalYearEndDay`
- **THEN** the system returns `400 Bad Request`

#### Scenario: Non-personal client — invalid calendar date
- **WHEN** an authenticated admin creates a CORPORATE or SELF_EMPLOYED client with an invalid date (e.g., month=2, day=30)
- **THEN** the system returns `400 Bad Request`

#### Scenario: ClientDto includes fiscal year end fields
- **WHEN** any admin endpoint returns a client record
- **THEN** the response JSON includes `fiscalYearEndMonth` and `fiscalYearEndDay`

