### Contract

- **Spec**: OAuth2 login with a Google account that provides no `name` attribute SHALL result in a user record with name set to the email prefix (not null). `users.name` SHALL be NOT NULL.
- **Runtime**: `cd backend && ./mvnw test -Dtest=OAuth2SuccessHandlerTest` → expected: test for null-name path passes; user saved with email-prefix name
- **Code**: In `OAuth2SuccessHandler.onAuthenticationSuccess()`, if `oauthUser.getAttribute("name")` returns null, fall back to `email.substring(0, email.indexOf('@'))`. Email is always non-null from Google OAuth.
- **Threshold**: 80
