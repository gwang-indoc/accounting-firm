# accounting-firm

Web application for an accounting firm. Monorepo containing a Spring Boot backend and Angular frontend.

**Tech Stack:**
- Backend: Java 21, Spring Boot 3.5, PostgreSQL
- Frontend: Angular 21
- Authentication: Google OAuth2

## Development Setup

### 1. PostgreSQL

**Option A — Homebrew (native macOS):**

```bash
# Install
brew install postgresql@16

# Start the service
brew services start postgresql@16

# Create the database
createdb accounting_firm
```

**Option B — Docker:**

```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop/
# Then run:
docker run -d --name accounting-pg \
  -e POSTGRES_DB=accounting_firm \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16
```

### 2. Environment variables

Create a `.env` file at the project root (already gitignored):

```bash
# Google OAuth2 — from console.cloud.google.com
# Create a project → APIs & Services → Credentials → OAuth 2.0 Client ID
# Application type: Web application
# Authorized redirect URI: http://localhost:8080/login/oauth2/code/google
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# JWT signing key — any random string, at least 32 characters
JWT_SECRET=change-me-to-a-random-32-char-string

# PostgreSQL
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/accounting_firm
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

# File uploads
UPLOAD_DIR=./uploads
UPLOAD_MAX_FILE_SIZE_MB=10
UPLOAD_MAX_FILENAME_LENGTH=100
BLOCKED_EXTENSIONS=exe,js

# Contact form — email address where contact submissions are delivered
CONTACT_NOTIFICATION_EMAIL=you@example.com
```

### 3. Start the backend

```bash
./start.sh
```

`start.sh` loads `.env` automatically, defaults to the `dev` Spring profile, and starts the backend on `localhost:8080`.

### 4. Start the frontend

```bash
cd frontend && npm start
```

The Angular dev server proxies `/api/**`, `/oauth2/**`, and `/login/oauth2/**` to the Spring Boot server at `localhost:8080`.

## Production Deployment

### 1. Create `.env.prod`

Copy `.env` to `.env.prod` (gitignored) and fill in production values. Add the SMTP block for outbound email:

```bash
# ... same keys as .env, with production values ...

# SMTP — Gmail example (requires an App Password, not your regular password)
# Enable 2-Step Verification at myaccount.google.com first, then generate
# an App Password at myaccount.google.com/apppasswords
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=you@gmail.com
SPRING_MAIL_PASSWORD=your-app-password
```

### 2. Start the production backend

```bash
./start_prod.sh
```

`start_prod.sh` requires `.env.prod` to exist (exits with an error if missing), sources it, forces `SPRING_PROFILES_ACTIVE=prod`, and starts the backend.

## Backend Commands

```bash
# Run the application (loads .env automatically)
./start.sh

# Build (skip tests)
cd backend && ./mvnw clean package -DskipTests

# Run all tests
cd backend && ./mvnw test

# Run a single test class
cd backend && ./mvnw test -Dtest=MyServiceTest

# Run a single test method
cd backend && ./mvnw test -Dtest=MyServiceTest#methodName
```

## Frontend Commands

```bash
# Install dependencies
cd frontend && npm install

# Start dev server (http://localhost:4200)
cd frontend && npm start

# Build for production
cd frontend && npm run build

# Run tests
cd frontend && npm test

# Run a single test file
cd frontend && npx ng test --include='**/my.component.spec.ts'

# Lint
cd frontend && npm run lint
```

## E2E Tests (Playwright)

E2E tests live under `e2e/`. Both the backend and frontend must be running before executing them.

```bash
# Install dependencies (first time only)
cd e2e && npm install

# Run all E2E tests
cd e2e && npx playwright test

# Run a specific test file
cd e2e && npx playwright test contact.spec.ts

# Run tests matching a keyword
cd e2e && npx playwright test --grep "login"
```
