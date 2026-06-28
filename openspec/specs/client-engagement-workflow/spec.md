# client-engagement-workflow Specification

## Purpose
Tracks the lifecycle of each client's annual tax filing as a per-client, per-tax-year engagement. Supports a five-state machine (START → IN_PROCESSING → PENDING_CLIENT_REVIEW → SUBMIT_TO_CRA → COMPLETED) with any-to-any transitions, a full audit trail in `client_engagement_history`, and bilingual (EN/ZH) email notifications to linked clients on four milestone states.
## Requirements
### Requirement: Create a client engagement
The system SHALL allow an authenticated admin to open a new engagement for a client for a specific tax year. Tax year is the calendar year in which the client's fiscal period ends. Multiple engagements per client per tax year are permitted, but no two engagements for the same client and tax year may share the same name. A `name` field (taxpayer name for PERSONAL clients; business name for CORPORATE / SELF_EMPLOYED clients) is mandatory on creation. A new engagement is created at status START.

#### Scenario: Successful engagement creation
- **WHEN** an authenticated admin sends `POST /api/admin/clients/{clientId}/engagements` with a valid `taxYear` and non-blank `name`
- **THEN** the system creates the engagement at status START, records an initial history entry (from=null, to=START), and returns `201 Created` with the engagement JSON including `id`, `name`, `taxYear`, `status`, and `note`

#### Scenario: Duplicate engagement name for same client and year
- **WHEN** an authenticated admin attempts to create an engagement for a client/tax-year combination where an engagement with the same name already exists
- **THEN** the system returns `409 Conflict`

#### Scenario: Same client and year with different name is allowed
- **WHEN** an authenticated admin creates a second engagement for a client/tax-year combination with a different name
- **THEN** the system creates the engagement successfully and returns `201 Created`

#### Scenario: Client not found
- **WHEN** an authenticated admin sends `POST /api/admin/clients/{clientId}/engagements` for a non-existent client
- **THEN** the system returns `404 Not Found`

#### Scenario: Missing tax year
- **WHEN** an authenticated admin sends `POST /api/admin/clients/{clientId}/engagements` without a `taxYear` field
- **THEN** the system returns `400 Bad Request`

#### Scenario: Missing or blank name
- **WHEN** an authenticated admin sends `POST /api/admin/clients/{clientId}/engagements` without a `name` field or with a blank `name`
- **THEN** the system returns `400 Bad Request`

---

### Requirement: List client engagements
The system SHALL allow an authenticated admin to retrieve all engagements for a given client, ordered by tax year descending.

#### Scenario: Successful list
- **WHEN** an authenticated admin sends `GET /api/admin/clients/{clientId}/engagements`
- **THEN** the system returns `200 OK` with a JSON array of engagements for that client, ordered by tax year descending (may be empty)

#### Scenario: Client not found
- **WHEN** an authenticated admin sends `GET /api/admin/clients/{clientId}/engagements` for a non-existent client
- **THEN** the system returns `404 Not Found`

---

### Requirement: Transition engagement status
The system SHALL allow an authenticated admin to move any engagement from any status to any other status. The transition SHALL be recorded in `client_engagement_history`. An optional free-text note may accompany any transition; when provided, it SHALL also replace the engagement's current `note` field. When `note` is null or absent, the engagement's `note` field is set to null.

#### Scenario: Successful status transition
- **WHEN** an authenticated admin sends `PATCH /api/admin/clients/{clientId}/engagements/{id}/status` with a valid `status` and optional `note`
- **THEN** the system updates the engagement's status, stamps `updated_by` and `updated_at`, replaces the engagement's `note` with the provided value (or null), appends a history row (from_status, to_status, changed_by, changed_at, note), and returns `200 OK` with the updated engagement including the new `note`

#### Scenario: Engagement not found
- **WHEN** an authenticated admin sends a status transition for an engagement ID that does not exist
- **THEN** the system returns `404 Not Found`

#### Scenario: Invalid status value
- **WHEN** an authenticated admin sends a status transition with an unrecognised status string
- **THEN** the system returns `400 Bad Request`

---

### Requirement: Engagement transition history
The system SHALL persist a history entry for every status transition, including the initial creation (from_status = null, to_status = START). Each history entry records: engagement ID, from_status (nullable), to_status, the admin user who made the change, the timestamp, and an optional free-text note.

#### Scenario: History entry created on status change
- **WHEN** an admin transitions an engagement's status
- **THEN** a new `client_engagement_history` row exists with the correct from_status, to_status, changed_by, changed_at, and note

#### Scenario: Initial history entry on engagement creation
- **WHEN** an engagement is created
- **THEN** a `client_engagement_history` row exists with from_status = null and to_status = START

#### Scenario: Get engagement history
- **WHEN** an authenticated admin sends `GET /api/admin/clients/{clientId}/engagements/{id}/history`
- **THEN** the system returns `200 OK` with the ordered list of history entries (oldest first)

---

### Requirement: List all engagements (workflow dashboard data)
The system SHALL provide an endpoint that returns all engagements across all clients and all tax years, including client name, business type, and engagement name, for use by the admin workflow dashboard.

#### Scenario: All engagements returned
- **WHEN** an authenticated admin sends `GET /api/admin/engagements`
- **THEN** the system returns `200 OK` with all engagements, each including `id`, `clientId`, `clientName`, `businessType`, `taxYear`, `name`, `status`, `updatedAt`, and `updatedByName`

### Requirement: Email notification on key status transitions
The system SHALL send an email to the client's linked user when an engagement status transitions to IN_PROCESSING, PENDING_CLIENT_REVIEW, SUBMIT_TO_CRA, or COMPLETED. The email language (EN or ZH) SHALL match the linked user's `language` preference (defaulting to EN if null). No email is sent for transitions to START or for transitions where the client has no linked user.

#### Scenario: Email sent on IN_PROCESSING
- **WHEN** an admin transitions an engagement to IN_PROCESSING and the client has a linked user
- **THEN** the system sends an email to the linked user's email address in the user's preferred language indicating work has started

#### Scenario: Email sent on PENDING_CLIENT_REVIEW
- **WHEN** an admin transitions an engagement to PENDING_CLIENT_REVIEW and the client has a linked user
- **THEN** the system sends an email to the linked user prompting them to review and sign their return

#### Scenario: Email sent on SUBMIT_TO_CRA
- **WHEN** an admin transitions an engagement to SUBMIT_TO_CRA and the client has a linked user
- **THEN** the system sends an email to the linked user confirming the return has been filed with CRA

#### Scenario: Email sent on COMPLETED
- **WHEN** an admin transitions an engagement to COMPLETED and the client has a linked user
- **THEN** the system sends an email to the linked user confirming the file is complete

#### Scenario: No email for START
- **WHEN** an admin transitions an engagement to START
- **THEN** the system does NOT send any email

#### Scenario: No email when no linked user
- **WHEN** an admin transitions an engagement to a notification state and the client has no linked user (userId is null)
- **THEN** the system does NOT send any email and does NOT error

#### Scenario: Email language follows user preference
- **WHEN** the linked user's language is "zh"
- **THEN** the notification email is sent in Chinese

#### Scenario: Email language defaults to English
- **WHEN** the linked user's language is null or "en"
- **THEN** the notification email is sent in English

---

### Requirement: Engagement endpoints are admin-only
All `/api/admin/clients/{clientId}/engagements` and `/api/admin/engagements` endpoints SHALL return `403 Forbidden` for any caller who is not an authenticated admin.

#### Scenario: Non-admin caller rejected
- **WHEN** a non-admin authenticated user calls any engagement endpoint
- **THEN** the system returns `403 Forbidden`

#### Scenario: Unauthenticated caller rejected
- **WHEN** an unauthenticated request reaches any engagement endpoint
- **THEN** the system returns `401 Unauthorized`

