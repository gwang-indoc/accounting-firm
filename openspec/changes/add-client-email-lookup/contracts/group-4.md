### Contract

- **Spec**: `POST /api/clients` SHALL set `admin_id` from authenticated user; SHALL return 400 if email not in users; SHALL return 409 if email already in clients. `GET /api/clients` SHALL return only the admin's own clients. `GET /api/clients/{id}` SHALL return 403 if client is owned by a different admin. `admin_id` is set server-side — never from request body.
- **Runtime**: `cd backend && ./mvnw test -Dtest=ClientControllerTest,ClientServiceTest` → expected: ownership scoping, duplicate email, and unregistered email tests all pass
- **Code**: `admin_id` resolved from JWT principal in `ClientController`, passed to `ClientService.createClient()`. `ClientService.createClient()` calls `UserRepository.findByEmail()` (400 if absent) and `ClientRepository.findByEmailIgnoreCaseOrderById()` (409 if non-empty) before persisting. All list/get queries filter by `adminId`. `CreateClientRequest` adds `@NotBlank email` field.
- **Threshold**: 80
