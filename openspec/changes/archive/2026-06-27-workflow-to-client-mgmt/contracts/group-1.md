### Contract

- **Spec**: From `specs/client-management/spec.md` (MODIFIED "List all clients") —
  - "Each client in the response SHALL include `activeEngagementStatus` — the status of the most recent non-COMPLETED engagement by tax year for that client; if all engagements are COMPLETED the field is COMPLETED; if the client has no engagements the field is null."
  - Scenario: activeEngagementStatus reflects latest active engagement — WHEN a client has engagements in multiple statuses including at least one non-COMPLETED, THEN the returned `activeEngagementStatus` is the status of the most recent non-COMPLETED engagement by tax year.
  - Scenario: activeEngagementStatus is null for client with no engagements — WHEN a client has no engagements, THEN the returned `activeEngagementStatus` is null.
  - Scenario: activeEngagementStatus falls back to COMPLETED when all engagements are done — WHEN a client's engagements are all at status COMPLETED, THEN the returned `activeEngagementStatus` is COMPLETED.
- **Runtime**: `cd backend && ./mvnw test` → new `ClientServiceTest` cases for all 4 status scenarios pass; existing controller and service tests unaffected
- **Code**: D1 — compute activeEngagementStatus server-side in `ClientService.findAll()` via two new Spring Data derived queries on `ClientEngagementRepository`: `findFirstByClientIdAndStatusNotOrderByTaxYearDesc(clientId, COMPLETED)` (primary — latest non-COMPLETED) and `findFirstByClientIdOrderByTaxYearDesc(clientId)` (fallback — latest overall); inject `ClientEngagementRepository` into `ClientService`; D2 — add nullable `activeEngagementStatus` field to existing `ClientDto` Java record (no new DTO)
- **Threshold**: 80
