### Contract

- **Spec**: The system SHALL provide `AuthService` methods `requestEmailCode(email)`, `verifyEmailCode(email, code)`, and `completeEmailSignup(token, name)`, each calling the corresponding backend endpoint with `withCredentials`. `AuthService` SHALL NOT expose password `register`/`loginWithEmail` methods after this change.
- **Runtime**: `cd frontend && npx ng test --include='**/auth.service.spec.ts' --no-watch` → expected: each method POSTs to its endpoint (`/api/auth/email/request-code|verify-code|complete-signup`); verify resolves with backend status; no `register`/`loginWithEmail` members exist.
- **Code**: Reuse existing `HttpClient` + `CredentialsInterceptor` (withCredentials already global). `verifyEmailCode` resolves with `{status, signupToken?}`. Remove `register`/`loginWithEmail`. Zoneless/signals — keep `currentUser` signal usage unchanged.
- **Threshold**: 80
