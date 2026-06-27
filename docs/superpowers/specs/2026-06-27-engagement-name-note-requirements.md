---
Date: 2026-06-27
Change: engagement-name-note
Status: DRAFT
---

## Goals

- Allow each client to have **multiple engagements per tax year** (one per business/taxpayer)
- Add a mandatory **name** field to each engagement (taxpayer name for PERSONAL; business name for CORPORATE / SELF_EMPLOYED), entered by the admin when creating the engagement
- Add a mutable **note** field to each engagement, editable by the admin via "Change Status"; the note is replaced (not appended) on each update
- Switch engagement URL routing from `{taxYear}` to `{id}` across all admin and client-portal endpoints
- Surface engagement name in the client portal

## Non-Goals

- Auto-populating the name from existing client data
- Changing the `BusinessType` enum values
- Adding note history / audit trail for note edits (the existing `ClientEngagementHistory.note` per-transition field is unrelated and unchanged)
- Any changes to the email notifications sent on status transitions

## Constraints

- Drop the unique constraint `(client_id, tax_year)` from `client_engagements`; replace it with `(client_id, tax_year, name)` to prevent duplicate engagement names for the same client and year
- Name is mandatory (NOT NULL, non-blank); backend must validate
- Note is optional (nullable TEXT); no max-length enforced at DB level
- All routes that currently use `{taxYear}` as the engagement identifier must be updated to `{id}` (Long engagement ID) — this is a breaking change accepted by the stakeholder
- Flyway: add a new versioned migration; never edit existing ones

## Success Criteria

- `ClientEngagement` entity has `name` (String, NOT NULL) and `note` (String, nullable) fields
- Flyway migration: drop old unique constraint, add `name` column, add `note` column, add new unique constraint `(client_id, tax_year, name)`
- `POST /api/admin/clients/{clientId}/engagements` accepts `{ taxYear, name }` and rejects blank name with 400
- `PATCH /api/admin/clients/{clientId}/engagements/{id}/status` accepts `{ status, note }` and persists `note` to the engagement row (replaces prior value)
- All admin engagement endpoints use `{id}` path segment (not `{taxYear}`)
- "New Engagement" dialog has a mandatory name text field; submit is disabled until name is non-blank
- "Change Status" dialog shows and allows editing the current engagement note; saving the status transition also saves the note
- Client portal engagement list displays the engagement name alongside tax year and status
- All backend tests pass: `cd backend && ./mvnw test`
- All frontend tests pass: `cd frontend && npx ng test --no-watch`

## User Stories

1. As an admin, I can create two separate engagements for the same client in the same tax year (e.g., "John Smith" for their personal return and "Smith Holdings Inc." for their corporation), each tracked independently.
2. As an admin, when I create a new engagement, I must enter a name before I can save it.
3. As an admin, when I open "Change Status", I can read and update the engagement-level note; the updated note replaces whatever was there before.
4. As a client, I can see the name of each engagement in my portal so I know which filing it refers to.

## Open Questions

- None

## Referenced Capabilities

- `ClientEngagement` — `/backend/src/main/java/com/gwhaitech/accountingfirm/client/domain/ClientEngagement.java`
- `ClientEngagementController` — current `{taxYear}` routes to be migrated to `{id}`
- `ClientEngagementService.createEngagement()` — receives `taxYear`; will also receive `name`
- `ClientEngagementService.transitionStatus()` — will also persist `note` to the engagement row
- `AdminNewEngagementDialogComponent` — add mandatory name field
- `AdminTransitionDialogComponent` — add note field (pre-filled with current note)
- `V14__create_client_engagements.sql` — reference for existing schema; new migration must follow V14
