### Contract

- **Spec**: Typing a valid email matching a user SHALL auto-fill the name field and show "Registered user: [name]" hint; allow submission. Typing a valid email with no match SHALL show "Email not registered" error and block submission. Typing a valid email already in clients SHALL show "Client already exists" error and block submission. Typing an invalid format SHALL make no API call. Submit SHALL be disabled during debounce.
- **Runtime**: `cd frontend && npx ng test --no-watch --include='**/admin-client-dialog.component.spec.ts'` → expected: all async-validator and hint/auto-fill tests pass
- **Code**: Async validator in `admin-clients.service.ts` (or a dedicated validator): debounce 400 ms, two sequential calls (lookup → client-exists check). On match: patch name control + emit hint. On 404: set `notRegistered` error. On 409: set `duplicateClient` error. Form invalid while validator pending → submit disabled.
- **Threshold**: 80
