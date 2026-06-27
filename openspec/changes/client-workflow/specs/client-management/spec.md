## ADDED Requirements

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
