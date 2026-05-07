## Requirements

### Requirement: New users can register with email and password
The system SHALL allow unauthenticated users to create a new account via `POST /api/auth/register`. The endpoint SHALL accept `fullName`, `email`, `password`, and `confirmPassword`. It SHALL validate inputs, hash the password with BCrypt, and persist a new `users` row with `google_sub = NULL`.

#### Scenario: Successful registration
- **WHEN** a POST to `/api/auth/register` is made with valid `fullName`, `email`, `password` (≥ 8 chars), and matching `confirmPassword`
- **THEN** the system returns HTTP 201
- **THEN** a new row exists in `users` with the given `email`, `full_name`, `password_hash` set, and `google_sub = NULL`
- **THEN** no JWT cookie is issued

#### Scenario: Passwords do not match
- **WHEN** `password` and `confirmPassword` differ
- **THEN** the system returns HTTP 400

#### Scenario: Password too short
- **WHEN** `password` is fewer than 8 characters
- **THEN** the system returns HTTP 400

#### Scenario: Duplicate email
- **WHEN** a registration is submitted with an email already in the `users` table
- **THEN** the system returns HTTP 409

#### Scenario: Endpoint is publicly accessible
- **WHEN** an unauthenticated request is made to `POST /api/auth/register`
- **THEN** Spring Security permits the request without requiring a JWT cookie

### Requirement: RegisterComponent presents a registration form using Angular Material
The system SHALL render `RegisterComponent` at `/register` as a standalone Angular component. The form SHALL use Angular Material components (`mat-card`, `mat-form-field`, `matInput`, `mat-error`, `mat-flat-button`). The form SHALL be a reactive `FormGroup`. Uses tree-shakeable individual imports (not barrel modules).

**Page layout:** Centered `mat-card` (max-width 420px) on a dot-grid `#f1f5f9` background, matching the login page design system. The card has a 3px sky-blue gradient top accent stripe, a brand block (navy 税 icon + "GWH Accounting" + tagline), a "NEW ACCOUNT" eyebrow label, "Create Account" `<h1>` heading, and "Fill in your details below" subtitle.

**Form fields** (all `mat-form-field appearance="outline"`, full-width via CSS class — no inline `style` attributes): Full Name, Email, Password, Confirm Password. Submit button is `mat-flat-button color="primary"` (full-width, 46px height, 8px border-radius). "← Back to Login" is a `mat-button` below the submit button.

#### Scenario: Form fields and validation
- **WHEN** the `/register` route is active
- **THEN** the page renders a `mat-card` with fields: Full Name, Email, Password, Confirm Password
- **THEN** each field uses `mat-form-field appearance="outline"` with `matInput` and `mat-error` for validation messages

#### Scenario: Client-side password mismatch
- **WHEN** the user submits the form with non-matching Password and Confirm Password
- **THEN** a `mat-error` is shown below the Confirm Password field ("Passwords do not match")
- **THEN** no HTTP request is sent

#### Scenario: Server-side duplicate email error
- **WHEN** the backend returns HTTP 409
- **THEN** a `mat-error` is shown below the Email field ("Email already registered")

#### Scenario: Successful registration navigates to login
- **WHEN** the backend returns HTTP 201
- **THEN** Angular navigates to `/login?registered=true`
- **THEN** `LoginComponent` shows a `MatSnackBar` message "Account created! Please sign in."

#### Scenario: Back to login link
- **WHEN** the user clicks "← Back to Login"
- **THEN** Angular navigates to `/login`
