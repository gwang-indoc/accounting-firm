### Contract

- **Spec**: "The system SHALL allow an authenticated admin to open a new engagement for a client for a specific tax year. Multiple engagements per client per tax year are permitted, but no two engagements for the same client and tax year may share the same name. A `name` field is mandatory on creation." — `client-engagement-workflow` spec, Requirement: Create a client engagement

- **Runtime**: `cd backend && ./mvnw test` → all existing tests pass; Flyway migration applies cleanly; `ClientEngagement` entity has `name` and `note` fields

- **Code**: Use `DEFAULT ''` temporarily for NOT NULL `name` column so existing rows are satisfied; drop default after adding constraint. New unique constraint is `(client_id, tax_year, name)`. `note` is nullable TEXT — no max length.

- **Threshold**: 80
