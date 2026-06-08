### Contract

- **Spec**: The system SHALL provide `GET /api/admin/users/lookup?email=` returning `{ "name": "..." }` on match (200), 404 if not found, 403 if non-admin, 400 if email param missing.
- **Runtime**: `cd backend && ./mvnw test -Dtest=UserLookupControllerTest` → expected: all 4 scenario tests pass
- **Code**: New `UserLookupController` under `com.gwhaitech.accountingfirm.auth.controller`; uses `UserRepository.findByEmail()`; returns only `{ name }` — no other user fields. Secured by existing admin role check pattern on `/api/admin/**`.
- **Threshold**: 80
