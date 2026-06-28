### Contract

- **Spec**: "WHEN an authenticated admin sends `POST /api/admin/clients/{clientId}/engagements` without a `name` field or with a blank `name` THEN the system returns `400 Bad Request`." "WHEN an authenticated admin sends `PATCH /api/admin/clients/{clientId}/engagements/{id}/status` with a valid `status` and optional `note` THEN the system updates the engagement's status, stamps `updated_by` and `updated_at`, replaces the engagement's `note` with the provided value (or null), appends a history row (from_status, to_status, changed_by, changed_at, note), and returns `200 OK` with the updated engagement including the new `note`." "WHEN an authenticated admin sends a status transition for an engagement ID that does not exist THEN the system returns `404 Not Found`." "WHEN an authenticated admin sends `GET /api/admin/clients/{clientId}/engagements/{id}/history` THEN the system returns `200 OK` with the ordered list of history entries (oldest first)." — `client-engagement-workflow` spec

- **Runtime**: `cd backend && ./mvnw test` → all tests pass including new tests for: blank name → 400, valid name → 201, duplicate name same year → 409, second name same year → 201, transition updates engagement.note, history GET uses {id}, unknown id → 404

- **Code**: `CreateEngagementRequest` has `@NotBlank String name`. `ClientEngagementService.createEngagement()` receives name, sets it on entity. `transitionStatus()` looks up by engagementId (Long), persists `request.note()` to `ClientEngagement.note`. Controller switches `{taxYear}` path param to `{id}` on history and status endpoints. Ownership check: verify `engagement.getClientId()` belongs to the authenticated admin's client set.

- **Threshold**: 80
